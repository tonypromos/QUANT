import { prisma } from '@/lib/db';
import { RealPolymarketClient } from '@/lib/polymarket/client';
import { getOrCreateSettings } from '@/lib/repository';
import { decimalToNumber } from '@/lib/utils';
import type { OpportunityDto } from '@/lib/types';

export type OpportunityFilters = {
  tag?: string | null;
  limit?: number;
  minLiquidity?: number;
  minConfidence?: number;
};

const toDto = (row: {
  marketId: string;
  marketTitle: string;
  tag: string;
  action: string;
  liquidityUsd: unknown;
  spread: unknown;
  impliedProbYes: unknown;
  posteriorProbYes: unknown;
  edge: unknown;
  confidence: unknown;
  score: unknown;
  createdAt: Date;
}): OpportunityDto => ({
  marketId: row.marketId,
  marketTitle: row.marketTitle,
  tag: row.tag,
  action: row.action === 'buy_no' ? 'buy_no' : 'buy_yes',
  liquidityUsd: decimalToNumber(row.liquidityUsd),
  spread: decimalToNumber(row.spread),
  impliedProbYes: decimalToNumber(row.impliedProbYes),
  posteriorProbYes: decimalToNumber(row.posteriorProbYes),
  edge: decimalToNumber(row.edge),
  confidence: decimalToNumber(row.confidence),
  score: decimalToNumber(row.score),
  createdAt: row.createdAt.toISOString()
});

export const listOpportunities = async (filters: OpportunityFilters): Promise<OpportunityDto[]> => {
  const settings = await getOrCreateSettings();
  const configuredMinLiquidity = filters.minLiquidity ?? decimalToNumber(settings.minLiquidityUsd);
  const configuredMinConfidence = filters.minConfidence ?? decimalToNumber(settings.minConfidence);
  const limit = Math.min(filters.limit ?? 25, 100);

  const queryRows = async (minLiquidity: number, minConfidence: number) =>
    prisma.opportunity.findMany({
      where: {
        ...(filters.tag ? { tag: filters.tag } : {}),
        liquidityUsd: {
          gte: minLiquidity
        },
        confidence: {
          gte: minConfidence
        },
        stale: false
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 500
    });

  let rows = await queryRows(configuredMinLiquidity, configuredMinConfidence);

  // Real-feed warmup fallback: if strict filters return nothing, relax to avoid a blank table.
  if (!rows.length) {
    const relaxedMinLiquidity = 0;
    const relaxedMinConfidence = Math.min(configuredMinConfidence, 0.001);
    rows = await queryRows(relaxedMinLiquidity, relaxedMinConfidence);
  }

  if (!rows.length) {
    return [];
  }

  const byMarket = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!byMarket.has(row.marketId)) {
      byMarket.set(row.marketId, row);
    }
  }

  const uniqueRows = Array.from(byMarket.values())
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, limit);

  return uniqueRows.map(toDto);
};

type BackfillNamesResult = {
  marketsChecked: number;
  namesResolved: number;
  rowsUpdated: number;
};

export const backfillMarketNames = async (): Promise<BackfillNamesResult> => {
  const fallbackPrefix = 'Market 0x';
  const [opps, snaps, paperOrders, paperPositions, liveOrders, livePositions] = await Promise.all([
    prisma.opportunity.findMany({ where: { marketTitle: { startsWith: fallbackPrefix } }, select: { marketId: true }, take: 1000 }),
    prisma.marketSnapshot.findMany({ where: { title: { startsWith: fallbackPrefix } }, select: { marketId: true }, take: 1000 }),
    prisma.paperOrder.findMany({ where: { marketTitle: { startsWith: fallbackPrefix } }, select: { marketId: true }, take: 1000 }),
    prisma.paperPosition.findMany({ where: { marketTitle: { startsWith: fallbackPrefix } }, select: { marketId: true }, take: 1000 }),
    prisma.liveOrder.findMany({ where: { marketTitle: { startsWith: fallbackPrefix } }, select: { marketId: true }, take: 1000 }),
    prisma.livePosition.findMany({ where: { marketTitle: { startsWith: fallbackPrefix } }, select: { marketId: true }, take: 1000 })
  ]);

  const marketIds = Array.from(
    new Set([...opps, ...snaps, ...paperOrders, ...paperPositions, ...liveOrders, ...livePositions].map((r) => r.marketId))
  );

  if (!marketIds.length) {
    return { marketsChecked: 0, namesResolved: 0, rowsUpdated: 0 };
  }

  const realClient = new RealPolymarketClient();
  const resolvedMap = await realClient.resolveTitlesByMarketIds(marketIds);

  let rowsUpdated = 0;
  for (const marketId of marketIds) {
    const title = resolvedMap.get(marketId.toLowerCase());
    if (!title) {
      continue;
    }

    const [u1, u2, u3, u4, u5, u6] = await Promise.all([
      prisma.opportunity.updateMany({
        where: { marketId, marketTitle: { startsWith: fallbackPrefix } },
        data: { marketTitle: title }
      }),
      prisma.marketSnapshot.updateMany({
        where: { marketId, title: { startsWith: fallbackPrefix } },
        data: { title }
      }),
      prisma.paperOrder.updateMany({
        where: { marketId, marketTitle: { startsWith: fallbackPrefix } },
        data: { marketTitle: title }
      }),
      prisma.paperPosition.updateMany({
        where: { marketId, marketTitle: { startsWith: fallbackPrefix } },
        data: { marketTitle: title }
      }),
      prisma.liveOrder.updateMany({
        where: { marketId, marketTitle: { startsWith: fallbackPrefix } },
        data: { marketTitle: title }
      }),
      prisma.livePosition.updateMany({
        where: { marketId, marketTitle: { startsWith: fallbackPrefix } },
        data: { marketTitle: title }
      })
    ]);

    rowsUpdated += u1.count + u2.count + u3.count + u4.count + u5.count + u6.count;
  }

  return {
    marketsChecked: marketIds.length,
    namesResolved: resolvedMap.size,
    rowsUpdated
  };
};
