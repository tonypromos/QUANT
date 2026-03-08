import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/guards';
import { prisma } from '@/lib/db';

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Params) {
  const guard = await requireSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const { id } = await context.params;

  const [snapshot, signals, opportunities, positions, orders] = await Promise.all([
    prisma.marketSnapshot.findFirst({ where: { marketId: id }, orderBy: { updatedAt: 'desc' } }),
    prisma.signalScore.findMany({ where: { marketId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.opportunity.findMany({ where: { marketId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.livePosition.findMany({ where: { marketId: id }, orderBy: { updatedAt: 'desc' } }),
    prisma.liveOrder.findMany({ where: { marketId: id }, orderBy: { createdAt: 'desc' }, take: 20 })
  ]);

  if (!snapshot) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 });
  }

  return NextResponse.json({
    market: snapshot,
    signals,
    opportunities,
    positions,
    orders
  });
}
