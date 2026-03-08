import { NextResponse, type NextRequest } from 'next/server';
import { BotMode } from '@prisma/client';
import { requireOperator } from '@/lib/guards';
import { prisma } from '@/lib/db';
import { createPaperTradeFromOpportunity } from '@/lib/services/paper';

export async function POST(request: NextRequest) {
  const guard = await requireOperator(request);
  if (!guard.ok) {
    return guard.response;
  }

  const [settings, botState] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 'singleton' } }),
    prisma.botState.findUnique({ where: { id: 'singleton' } })
  ]);

  if (!settings) {
    return NextResponse.json({ error: 'Settings missing' }, { status: 500 });
  }

  const top =
    (await prisma.opportunity.findFirst({
      where: {
        stale: false,
        tag: { in: settings.whitelistTags },
        liquidityUsd: { gte: 0 },
        confidence: { gte: 0 }
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }]
    })) ??
    (await prisma.opportunity.findFirst({
      where: {
        stale: false,
        liquidityUsd: { gte: 0 },
        confidence: { gte: 0 }
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }]
    }));

  if (!top) {
    return NextResponse.json({ error: 'No opportunities available yet' }, { status: 404 });
  }

  const snapshot = await prisma.marketSnapshot.findFirst({
    where: { marketId: top.marketId },
    orderBy: { updatedAt: 'desc' }
  });

  if (!snapshot) {
    return NextResponse.json({ error: 'Snapshot missing for selected market' }, { status: 404 });
  }

  const bankroll = Number(settings.bankrollUsd);
  const notional = Math.max(5, Math.min(bankroll * 0.01, bankroll * Number(settings.maxExposurePerMarketPct)));

  const order = await createPaperTradeFromOpportunity(prisma, {
    marketId: top.marketId,
    marketTitle: top.marketTitle,
    tag: top.tag,
    action: top.action === 'buy_no' ? 'buy_no' : 'buy_yes',
    impliedProbYes: Number(top.impliedProbYes),
    bestBidYes: Number(snapshot.bestBidYes),
    bestAskYes: Number(snapshot.bestAskYes),
    spread: Number(top.spread),
    quantityUsd: notional,
    mode: botState?.mode ?? BotMode.hours_to_days,
    reason: 'manual_paper_run_once'
  });

  return NextResponse.json({ ok: true, orderId: order.id, marketTitle: order.marketTitle });
}
