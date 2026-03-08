import { BotMode, OrderSide, type PrismaClient } from '@prisma/client';
import { simulateConservativeFill } from '@/lib/execution/paper-service';

const computeUnrealizedPnl = (side: OrderSide, avgPrice: number, markProbYes: number, qtyUsd: number): number => {
  if (side === OrderSide.yes) {
    return (markProbYes - avgPrice) * qtyUsd;
  }
  return (avgPrice - markProbYes) * qtyUsd;
};

export const updatePaperMarks = async (prisma: PrismaClient): Promise<void> => {
  const [positions, snapshots] = await Promise.all([
    prisma.paperPosition.findMany(),
    prisma.marketSnapshot.findMany({
      distinct: ['marketId'],
      orderBy: [{ marketId: 'asc' }, { updatedAt: 'desc' }]
    })
  ]);

  const latestByMarket = new Map(snapshots.map((s) => [s.marketId, s]));

  for (const pos of positions) {
    const latest = latestByMarket.get(pos.marketId);
    if (!latest) {
      continue;
    }
    const markProbYes = Number(latest.impliedProbYes);
    const qty = Number(pos.netQuantityUsd);

    await prisma.paperPosition.update({
      where: { id: pos.id },
      data: {
        markPrice: markProbYes,
        unrealizedPnlUsd: computeUnrealizedPnl(pos.side, Number(pos.avgPrice), markProbYes, qty)
      }
    });
  }
};

export const createPaperTradeFromOpportunity = async (
  prisma: PrismaClient,
  input: {
    marketId: string;
    marketTitle: string;
    tag: string;
    action: 'buy_yes' | 'buy_no';
    impliedProbYes: number;
    bestBidYes: number;
    bestAskYes: number;
    spread: number;
    quantityUsd: number;
    mode: BotMode;
    reason: string;
  }
) => {
  const side = input.action === 'buy_no' ? OrderSide.no : OrderSide.yes;

  const bid = side === OrderSide.yes ? input.bestBidYes : 1 - input.bestAskYes;
  const ask = side === OrderSide.yes ? input.bestAskYes : 1 - input.bestBidYes;
  const fillPrice = simulateConservativeFill({
    side,
    bid,
    ask,
    spread: input.spread,
    orderUsd: input.quantityUsd,
    mode: input.mode
  });

  const order = await prisma.paperOrder.create({
    data: {
      marketId: input.marketId,
      marketTitle: input.marketTitle,
      tag: input.tag,
      side,
      quantityUsd: input.quantityUsd,
      fillPrice,
      impliedProbYes: input.impliedProbYes,
      reason: input.reason,
      mode: input.mode,
      fills: {
        create: {
          fillPrice,
          quantityUsd: input.quantityUsd,
          feeUsd: 0
        }
      }
    }
  });

  const existing = await prisma.paperPosition.findUnique({
    where: {
      marketId_side: {
        marketId: input.marketId,
        side
      }
    }
  });

  if (!existing) {
    await prisma.paperPosition.create({
      data: {
        marketId: input.marketId,
        marketTitle: input.marketTitle,
        tag: input.tag,
        side,
        netQuantityUsd: input.quantityUsd,
        avgPrice: input.impliedProbYes,
        markPrice: input.impliedProbYes,
        unrealizedPnlUsd: 0,
        realizedPnlUsd: 0
      }
    });
  } else {
    const oldQty = Number(existing.netQuantityUsd);
    const newQty = oldQty + input.quantityUsd;
    const avgPrice =
      newQty > 0 ? (Number(existing.avgPrice) * oldQty + input.impliedProbYes * input.quantityUsd) / newQty : input.impliedProbYes;

    await prisma.paperPosition.update({
      where: { id: existing.id },
      data: {
        netQuantityUsd: newQty,
        avgPrice,
        markPrice: input.impliedProbYes,
        unrealizedPnlUsd: computeUnrealizedPnl(side, avgPrice, input.impliedProbYes, newQty)
      }
    });
  }

  return order;
};

export const maybeAutoClosePaperPositions = async (prisma: PrismaClient): Promise<number> => {
  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });
  if (!settings) {
    return 0;
  }

  const openPositions = await prisma.paperPosition.findMany({
    where: {
      netQuantityUsd: {
        gt: 0
      }
    }
  });

  let closedCount = 0;
  for (const pos of openPositions) {
    const latestSignal = await prisma.opportunity.findFirst({
      where: { marketId: pos.marketId, stale: false },
      orderBy: { createdAt: 'desc' }
    });
    if (!latestSignal) {
      continue;
    }

    const edge = Number(latestSignal.edge);
    const weakEdge = Math.abs(edge) < Number(settings.edgeThreshold) * 0.5;
    const signFlipped = pos.side === OrderSide.yes ? edge <= 0 : edge >= 0;
    const shouldClose = weakEdge || signFlipped;

    if (!shouldClose) {
      continue;
    }

    const qty = Number(pos.netQuantityUsd);
    const markProbYes = Number(latestSignal.impliedProbYes);
    const avgPrice = Number(pos.avgPrice);
    const realizedDelta = pos.side === OrderSide.yes ? (markProbYes - avgPrice) * qty : (avgPrice - markProbYes) * qty;

    await prisma.$transaction([
      prisma.paperOrder.create({
        data: {
          marketId: pos.marketId,
          marketTitle: pos.marketTitle,
          tag: pos.tag,
          side: pos.side,
          quantityUsd: qty,
          fillPrice: markProbYes,
          impliedProbYes: markProbYes,
          reason: weakEdge ? 'auto_exit_weak_edge' : 'auto_exit_sign_flip',
          mode: settings.modeDefault,
          fills: {
            create: {
              fillPrice: markProbYes,
              quantityUsd: qty,
              feeUsd: 0
            }
          }
        }
      }),
      prisma.paperPosition.update({
        where: { id: pos.id },
        data: {
          netQuantityUsd: 0,
          markPrice: markProbYes,
          unrealizedPnlUsd: 0,
          realizedPnlUsd: Number(pos.realizedPnlUsd) + realizedDelta
        }
      })
    ]);

    closedCount += 1;
  }

  return closedCount;
};
