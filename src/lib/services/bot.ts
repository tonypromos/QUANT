import { BotMode, Prisma, RiskEventType, UserRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { runPreflightChecks } from '@/lib/preflight';
import { writeAuditEvent } from '@/lib/audit';
import { getOrCreateBotState } from '@/lib/repository';
import { getRiskSnapshot } from '@/lib/risk';
import type { BotStatusDto } from '@/lib/types';

const toBotStatus = async (): Promise<BotStatusDto> => {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since1h = new Date(Date.now() - 60 * 60 * 1000);
  const [bot, worker, latestSnapshot] = await Promise.all([
    getOrCreateBotState(),
    prisma.workerHeartbeat.findUnique({ where: { source: 'polymarket-worker' } }),
    prisma.marketSnapshot.findFirst({ orderBy: { updatedAt: 'desc' } })
  ]);
  const [paperOrders24h, liveOrders24h, opportunities1h] = await Promise.all([
    prisma.paperOrder.count({ where: { createdAt: { gte: since24h } } }),
    prisma.liveOrder.count({ where: { createdAt: { gte: since24h } } }),
    prisma.opportunity.count({ where: { createdAt: { gte: since1h } } })
  ]);
  const [lastPaperOrder, lastLiveOrder] = await Promise.all([
    prisma.paperOrder.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.liveOrder.findFirst({ orderBy: { createdAt: 'desc' } })
  ]);

  const workerHealthy = Boolean(worker && Date.now() - worker.lastSeenAt.getTime() <= 15_000);
  const dataFresh = Boolean(latestSnapshot && Date.now() - latestSnapshot.updatedAt.getTime() <= 15_000);

  return {
    liveEnabled: bot.liveEnabled,
    mode: bot.mode,
    killSwitchActive: bot.killSwitchActive,
    haltedReason: bot.haltedReason,
    lastPreflightAt: bot.lastPreflightAt?.toISOString() ?? null,
    lastDecisionAt: bot.lastDecisionAt?.toISOString() ?? null,
    workerHealthy,
    dataFresh,
    paperOrders24h,
    liveOrders24h,
    opportunities1h,
    lastPaperOrderAt: lastPaperOrder?.createdAt.toISOString() ?? null,
    lastLiveOrderAt: lastLiveOrder?.createdAt.toISOString() ?? null
  };
};

export const getBotStatus = async (): Promise<BotStatusDto> => toBotStatus();

export const enableLiveBot = async (actor: { id: string; role: UserRole }) => {
  const preflight = await runPreflightChecks();
  if (!preflight.pass) {
    await prisma.riskEvent.create({
      data: {
        type: RiskEventType.preflight_fail,
        reason: 'Preflight failed when enabling live bot.',
        detailsJson: preflight.checks as Prisma.InputJsonValue
      }
    });
    await writeAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'bot.live.enable.denied_preflight',
      targetType: 'BotState',
      targetId: 'singleton',
      detailsJson: { checks: preflight.checks }
    });

    return {
      enabled: false,
      preflight
    };
  }

  await prisma.botState.update({
    where: { id: 'singleton' },
    data: {
      liveEnabled: true,
      haltedReason: null,
      lastPreflightAt: new Date()
    }
  });

  await writeAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'bot.live.enabled',
    targetType: 'BotState',
    targetId: 'singleton',
    detailsJson: { checks: preflight.checks }
  });

  return {
    enabled: true,
    preflight
  };
};

export const disableLiveBot = async (actor: { id: string; role: UserRole }, reason = 'manual_disable') => {
  await prisma.botState.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      liveEnabled: false,
      haltedReason: reason
    },
    update: {
      liveEnabled: false,
      haltedReason: reason
    }
  });

  await writeAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'bot.live.disabled',
    targetType: 'BotState',
    targetId: 'singleton',
    detailsJson: { reason }
  });
};

export const triggerKillSwitch = async (actor: { id?: string; role?: UserRole }, reason: string) => {
  await prisma.$transaction([
    prisma.botState.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        liveEnabled: false,
        killSwitchActive: true,
        haltedReason: reason
      },
      update: {
        liveEnabled: false,
        killSwitchActive: true,
        haltedReason: reason
      }
    }),
    prisma.liveOrder.updateMany({
      where: {
        status: {
          in: ['pending', 'open', 'partially_filled']
        }
      },
      data: {
        status: 'canceled'
      }
    }),
    prisma.riskEvent.create({
      data: {
        type: RiskEventType.manual_kill_switch,
        reason
      }
    })
  ]);

  await writeAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'bot.kill_switch.triggered',
    targetType: 'BotState',
    targetId: 'singleton',
    detailsJson: { reason }
  });
};

export const setBotMode = async (actor: { id: string; role: UserRole }, mode: BotMode) => {
  await prisma.botState.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', mode },
    update: { mode }
  });

  await writeAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'bot.mode.updated',
    targetType: 'BotState',
    targetId: 'singleton',
    detailsJson: { mode }
  });
};

export const riskGatePass = async (): Promise<{ pass: boolean; reason?: string }> => {
  const risk = await getRiskSnapshot();
  if (risk.staleData) {
    return { pass: false, reason: 'stale_data' };
  }
  if (!risk.canOpenNewPosition) {
    return { pass: false, reason: 'risk_limits' };
  }
  return { pass: true };
};
