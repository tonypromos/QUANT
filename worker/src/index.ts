import { BotMode, OrderSide, OrderStatus, PrismaClient, RiskEventType } from '@prisma/client';
import { MockPolymarketClient, RealPolymarketClient, type PolymarketClient } from '@/lib/polymarket/client';
import { computePosterior } from '@/lib/signal';
import { createPaperTradeFromOpportunity, maybeAutoClosePaperPositions, updatePaperMarks } from '@/lib/services/paper';
import { env } from '@/lib/env';

const prisma = new PrismaClient();

const pickClient = (): PolymarketClient => {
  if (env.polymarketFeedMode.toLowerCase() === 'real') {
    return new RealPolymarketClient();
  }
  return new MockPolymarketClient();
};

const client = pickClient();

const upsertHeartbeat = async () => {
  const feedMode = env.polymarketFeedMode.toLowerCase() === 'real' ? 'real' : 'mock';
  const hasApiCreds = Boolean(env.polymarketApiKey && env.polymarketApiSecret && env.polymarketApiPassphrase && env.polymarketProfileKey);

  await prisma.workerHeartbeat.upsert({
    where: { source: 'polymarket-worker' },
    create: {
      source: 'polymarket-worker',
      lastSeenAt: new Date(),
      detailsJson: { source: feedMode, hasApiCreds }
    },
    update: {
      lastSeenAt: new Date(),
      detailsJson: { source: feedMode, hasApiCreds }
    }
  });
};

const runTick = async () => {
  const ticks = await client.fetchTicks();

  for (const tick of ticks) {
    const spread = Math.max(0.0001, tick.bestAskYes - tick.bestBidYes);
    const impliedProbYes = (tick.bestBidYes + tick.bestAskYes) / 2;

    const signal = computePosterior(impliedProbYes, {
      orderImbalance: tick.orderImbalance,
      momentum5m: (Math.random() - 0.5) * 0.2,
      spread,
      volumeSpike: Math.min(2, tick.volume5m / 5000)
    });

    const action = signal.edge >= 0 ? 'buy_yes' : 'buy_no';

    await prisma.$transaction([
      prisma.marketSnapshot.create({
        data: {
          marketId: tick.marketId,
          title: tick.title,
          tag: tick.tag,
          liquidityUsd: tick.liquidityUsd,
          spread,
          impliedProbYes,
          bestBidYes: tick.bestBidYes,
          bestAskYes: tick.bestAskYes,
          volume5m: tick.volume5m,
          orderImbalance: tick.orderImbalance
        }
      }),
      prisma.signalScore.create({
        data: {
          marketId: tick.marketId,
          impliedProbYes,
          posteriorProbYes: signal.posterior,
          edge: signal.edge,
          confidence: signal.confidence,
          score: signal.score,
          featureJson: {
            orderImbalance: tick.orderImbalance,
            momentum5m: 0,
            spread,
            volumeSpike: tick.volume5m / 5000,
            z: signal.z
          },
          modelVersion: 'v1-market-only'
        }
      }),
      prisma.opportunity.create({
        data: {
          marketId: tick.marketId,
          marketTitle: tick.title,
          tag: tick.tag,
          action,
          liquidityUsd: tick.liquidityUsd,
          spread,
          impliedProbYes,
          posteriorProbYes: signal.posterior,
          edge: signal.edge,
          confidence: signal.confidence,
          score: signal.score
        }
      })
    ]);
  }

  return ticks.length;
};

const maybeRunAutonomousDecision = async () => {
  const [botState, settings] = await Promise.all([
    prisma.botState.findUnique({ where: { id: 'singleton' } }),
    prisma.settings.findUnique({ where: { id: 'singleton' } })
  ]);

  if (!botState || !settings || !botState.liveEnabled || botState.killSwitchActive) {
    return { attempted: false, placed: false, reason: 'live_disabled_or_killed' };
  }

  const cadenceMs = botState.mode === BotMode.minutes_to_hours ? 5 * 60 * 1000 : 30 * 60 * 1000;
  if (botState.lastOrderAt && Date.now() - botState.lastOrderAt.getTime() < cadenceMs) {
    return { attempted: false, placed: false, reason: 'cadence_guard' };
  }

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const todaysOrders = await prisma.liveOrder.count({
    where: {
      createdAt: { gte: dayStart }
    }
  });

  if (todaysOrders >= settings.maxNewPositionsPerDay) {
    await prisma.riskEvent.create({
      data: {
        type: RiskEventType.auto_kill_switch,
        reason: 'max_new_positions_per_day_reached',
        detailsJson: { todaysOrders, limit: settings.maxNewPositionsPerDay }
      }
    });
    return { attempted: true, placed: false, reason: 'max_positions_day' };
  }

  const dailyPnlAgg = await prisma.livePosition.aggregate({
    _sum: {
      realizedPnlUsd: true
    },
    where: {
      updatedAt: { gte: dayStart }
    }
  });

  const dailyRealizedPnlUsd = Number(dailyPnlAgg._sum.realizedPnlUsd ?? 0);
  const dailyLossPct = settings.bankrollUsd.toNumber() > 0 ? Math.max(0, -dailyRealizedPnlUsd / settings.bankrollUsd.toNumber()) : 0;
  if (dailyLossPct >= settings.dailyLossStopPct.toNumber()) {
    await prisma.$transaction([
      prisma.botState.update({
        where: { id: 'singleton' },
        data: {
          liveEnabled: false,
          killSwitchActive: true,
          haltedReason: 'daily_loss_stop'
        }
      }),
      prisma.riskEvent.create({
        data: {
          type: RiskEventType.daily_loss_stop,
          reason: 'daily_loss_stop',
          detailsJson: {
            dailyLossPct,
            threshold: settings.dailyLossStopPct.toNumber()
          }
        }
      }),
      prisma.liveOrder.updateMany({
        where: {
          status: {
            in: [OrderStatus.pending, OrderStatus.open, OrderStatus.partially_filled]
          }
        },
        data: {
          status: OrderStatus.canceled
        }
      })
    ]);
    return { attempted: true, placed: false, reason: 'daily_loss_stop' };
  }

  const queryTopOpportunity = async (opts: { enforceTag: boolean; minLiquidity: number }) =>
    prisma.opportunity.findMany({
      where: {
        stale: false,
        ...(opts.enforceTag ? { tag: { in: settings.whitelistTags } } : {}),
        liquidityUsd: { gte: opts.minLiquidity },
        spread: { lte: settings.maxSpread },
        confidence: { gte: settings.minConfidence },
        OR: [{ edge: { gte: settings.edgeThreshold } }, { edge: { lte: settings.edgeThreshold.mul(-1) } }]
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: 1
    });

  let selected = await queryTopOpportunity({
    enforceTag: true,
    minLiquidity: settings.minLiquidityUsd.toNumber()
  });

  if (!selected.length && settings.minLiquidityUsd.toNumber() > 0) {
    selected = await queryTopOpportunity({ enforceTag: true, minLiquidity: 0 });
  }

  if (!selected.length) {
    selected = await queryTopOpportunity({
      enforceTag: false,
      minLiquidity: settings.minLiquidityUsd.toNumber()
    });
  }

  if (!selected.length && settings.minLiquidityUsd.toNumber() > 0) {
    selected = await queryTopOpportunity({ enforceTag: false, minLiquidity: 0 });
  }

  if (!selected.length) {
    await prisma.botState.update({
      where: { id: 'singleton' },
      data: { lastDecisionAt: new Date() }
    });
    return { attempted: true, placed: false, reason: 'no_eligible_opportunity' };
  }

  const top = selected[0];
  const side: OrderSide = top.action === 'buy_no' ? OrderSide.no : OrderSide.yes;
  const bankroll = settings.bankrollUsd.toNumber();
  const edge = Math.abs(top.edge.toNumber());
  const confidence = top.confidence.toNumber();
  const spreadPenalty = Math.max(0.2, 1 - top.spread.toNumber() * 10);
  const rawSize = bankroll * settings.maxExposurePerMarketPct.toNumber() * edge * confidence * spreadPenalty * 10;
  const quantityUsd = Math.max(5, Math.min(rawSize, bankroll * settings.maxExposurePerMarketPct.toNumber()));
  const ttlSec = Math.max(settings.orderTtlSecMin, Math.min(settings.orderTtlSecMax, 90));
  const limitPrice = side === OrderSide.yes ? Math.min(0.99, top.impliedProbYes.toNumber() + 0.002) : Math.max(0.01, top.impliedProbYes.toNumber() - 0.002);

  await prisma.liveOrder.create({
    data: {
      marketId: top.marketId,
      marketTitle: top.marketTitle,
      tag: top.tag,
      side,
      quantityUsd,
      limitPrice,
      ttlSec,
      status: OrderStatus.pending,
      reason: 'autonomous_signal',
      mode: botState.mode
    }
  });

  await prisma.botState.update({
    where: { id: 'singleton' },
    data: {
      lastDecisionAt: new Date(),
      lastOrderAt: new Date()
    }
  });

  return { attempted: true, placed: true, reason: 'order_created' };
};

const maybeRunPaperDecision = async () => {
  const [botState, settings] = await Promise.all([
    prisma.botState.findUnique({ where: { id: 'singleton' } }),
    prisma.settings.findUnique({ where: { id: 'singleton' } })
  ]);

  if (!botState || !settings || !settings.paperAutotradeEnabled || botState.liveEnabled || botState.killSwitchActive) {
    return { attempted: false, placed: false, reason: 'paper_disabled_or_live_enabled_or_killed' };
  }

  const cadenceMs = botState.mode === BotMode.minutes_to_hours ? 5 * 60 * 1000 : 30 * 60 * 1000;
  if (botState.lastOrderAt && Date.now() - botState.lastOrderAt.getTime() < cadenceMs) {
    return { attempted: false, placed: false, reason: 'cadence_guard' };
  }

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const todaysPaperOrders = await prisma.paperOrder.count({
    where: {
      createdAt: { gte: dayStart }
    }
  });

  if (todaysPaperOrders >= settings.maxNewPositionsPerDay) {
    await prisma.auditEvent.create({
      data: {
        action: 'paper.skip.max_positions_day',
        targetType: 'PaperOrder',
        detailsJson: { todaysPaperOrders, limit: settings.maxNewPositionsPerDay }
      }
    });
    return { attempted: true, placed: false, reason: 'max_positions_day' };
  }

  const queryTopOpportunity = async (opts: { enforceTag: boolean; minLiquidity: number }) =>
    prisma.opportunity.findMany({
      where: {
        stale: false,
        ...(opts.enforceTag ? { tag: { in: settings.whitelistTags } } : {}),
        liquidityUsd: { gte: opts.minLiquidity },
        spread: { lte: settings.maxSpread },
        confidence: { gte: settings.minConfidence },
        OR: [{ edge: { gte: settings.edgeThreshold } }, { edge: { lte: settings.edgeThreshold.mul(-1) } }]
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: 1
    });

  let selected = await queryTopOpportunity({
    enforceTag: true,
    minLiquidity: settings.minLiquidityUsd.toNumber()
  });

  if (!selected.length && settings.minLiquidityUsd.toNumber() > 0) {
    selected = await queryTopOpportunity({ enforceTag: true, minLiquidity: 0 });
  }

  if (!selected.length) {
    selected = await queryTopOpportunity({
      enforceTag: false,
      minLiquidity: settings.minLiquidityUsd.toNumber()
    });
  }

  if (!selected.length && settings.minLiquidityUsd.toNumber() > 0) {
    selected = await queryTopOpportunity({ enforceTag: false, minLiquidity: 0 });
  }

  if (!selected.length) {
    await prisma.botState.update({
      where: { id: 'singleton' },
      data: { lastDecisionAt: new Date() }
    });
    return { attempted: true, placed: false, reason: 'no_eligible_opportunity' };
  }

  const top = selected[0];
  const snapshot = await prisma.marketSnapshot.findFirst({
    where: { marketId: top.marketId },
    orderBy: { updatedAt: 'desc' }
  });

  if (!snapshot) {
    return { attempted: true, placed: false, reason: 'missing_snapshot' };
  }

  const bankroll = settings.bankrollUsd.toNumber();
  const edge = Math.abs(top.edge.toNumber());
  const confidence = top.confidence.toNumber();
  const spreadPenalty = Math.max(0.2, 1 - top.spread.toNumber() * 10);
  const rawSize = bankroll * settings.maxExposurePerMarketPct.toNumber() * edge * confidence * spreadPenalty * 10;
  const quantityUsd = Math.max(5, Math.min(rawSize, bankroll * settings.maxExposurePerMarketPct.toNumber()));

  await createPaperTradeFromOpportunity(prisma, {
    marketId: top.marketId,
    marketTitle: top.marketTitle,
    tag: top.tag,
    action: top.action === 'buy_no' ? 'buy_no' : 'buy_yes',
    impliedProbYes: top.impliedProbYes.toNumber(),
    bestBidYes: snapshot.bestBidYes.toNumber(),
    bestAskYes: snapshot.bestAskYes.toNumber(),
    spread: top.spread.toNumber(),
    quantityUsd,
    mode: botState.mode,
    reason: 'paper_autonomous_signal'
  });

  await prisma.botState.update({
    where: { id: 'singleton' },
    data: {
      lastDecisionAt: new Date(),
      lastOrderAt: new Date()
    }
  });

  return { attempted: true, placed: true, reason: 'paper_order_created' };
};

const loop = async () => {
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {}
  });

  await prisma.botState.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {}
  });

  while (true) {
    try {
      await upsertHeartbeat();
      const tickCount = await runTick();
      await updatePaperMarks(prisma);
      const closedPaperCount = await maybeAutoClosePaperPositions(prisma);
      const paperResult = await maybeRunPaperDecision();
      const liveResult = await maybeRunAutonomousDecision();
      const now = new Date().toISOString();
      console.log(
        `[worker] ${now} ticks=${tickCount} paper=${paperResult?.reason ?? 'n/a'} paperClosed=${closedPaperCount} live=${liveResult?.reason ?? 'n/a'}`
      );
    } catch (error) {
      // Keep loop alive and persist audit diagnostics.
      await prisma.auditEvent.create({
        data: {
          action: 'worker.tick.error',
          targetType: 'Worker',
          detailsJson: {
            message: error instanceof Error ? error.message : String(error)
          }
        }
      });
      console.error('[worker] tick error', error);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
};

void loop();
