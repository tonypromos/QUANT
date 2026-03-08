import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/guards';
import { prisma } from '@/lib/db';
import { decimalToNumber } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const guard = await requireSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const [positions, fills] = await Promise.all([
    prisma.livePosition.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.liveFill.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        order: true
      }
    })
  ]);

  const totals = positions.reduce(
    (acc, p) => {
      acc.realizedPnlUsd += decimalToNumber(p.realizedPnlUsd);
      acc.unrealizedPnlUsd += decimalToNumber(p.unrealizedPnlUsd);
      acc.grossNotionalUsd += Math.abs(decimalToNumber(p.netQuantityUsd) * decimalToNumber(p.markPrice));
      return acc;
    },
    { realizedPnlUsd: 0, unrealizedPnlUsd: 0, grossNotionalUsd: 0 }
  );

  return NextResponse.json({
    totals,
    positions,
    recentFills: fills
  });
}
