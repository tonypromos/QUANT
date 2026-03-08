import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { decimalToNumber } from '@/lib/utils';
import { getOrCreateSettings } from '@/lib/repository';

export type RiskSnapshot = {
  bankrollUsd: number;
  exposureByMarket: Record<string, number>;
  exposureByTag: Record<string, number>;
  totalExposurePct: number;
  dailyRealizedPnlUsd: number;
  dailyLossPct: number;
  staleData: boolean;
  canOpenNewPosition: boolean;
};

export const getRiskSnapshot = async (): Promise<RiskSnapshot> => {
  const settings = await getOrCreateSettings();
  const bankrollUsd = decimalToNumber(settings.bankrollUsd);

  const positions = await prisma.livePosition.findMany();
  const exposureByMarket: Record<string, number> = {};
  const exposureByTag: Record<string, number> = {};
  let totalExposureUsd = 0;

  for (const p of positions) {
    const exposureUsd = Math.abs(decimalToNumber(p.netQuantityUsd) * decimalToNumber(p.markPrice));
    exposureByMarket[p.marketId] = exposureUsd;
    exposureByTag[p.tag] = (exposureByTag[p.tag] ?? 0) + exposureUsd;
    totalExposureUsd += exposureUsd;
  }

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const pnlAgg = await prisma.livePosition.aggregate({
    _sum: {
      realizedPnlUsd: true
    },
    where: {
      updatedAt: {
        gte: dayStart
      }
    }
  });

  const dailyRealizedPnlUsd = decimalToNumber(pnlAgg._sum.realizedPnlUsd);
  const dailyLossPct = bankrollUsd > 0 ? Math.max(0, -dailyRealizedPnlUsd / bankrollUsd) : 0;

  const latestSnapshot = await prisma.marketSnapshot.findFirst({
    orderBy: { updatedAt: 'desc' }
  });
  const staleData = !latestSnapshot || Date.now() - latestSnapshot.updatedAt.getTime() > 15_000;

  const totalExposurePct = bankrollUsd > 0 ? totalExposureUsd / bankrollUsd : 0;
  const canOpenNewPosition =
    !staleData &&
    dailyLossPct < decimalToNumber(settings.dailyLossStopPct) &&
    totalExposurePct < decimalToNumber(settings.maxTotalExposurePct);

  return {
    bankrollUsd,
    exposureByMarket,
    exposureByTag,
    totalExposurePct,
    dailyRealizedPnlUsd,
    dailyLossPct,
    staleData,
    canOpenNewPosition
  };
};

export const checkDailyLossStop = async (): Promise<{ tripped: boolean; threshold: number; dailyLossPct: number }> => {
  const settings = await getOrCreateSettings();
  const risk = await getRiskSnapshot();
  const threshold = decimalToNumber(settings.dailyLossStopPct);
  return {
    tripped: risk.dailyLossPct >= threshold,
    threshold,
    dailyLossPct: risk.dailyLossPct
  };
};

export const applyRiskHalt = async (reason: string, details: Prisma.InputJsonValue = {}): Promise<void> => {
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
    prisma.riskEvent.create({
      data: {
        type: 'auto_kill_switch',
        reason,
        detailsJson: details
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
    })
  ]);
};
