import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/guards';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const guard = await requireSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const [positions, fills] = await Promise.all([
    prisma.paperPosition.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.paperFill.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { order: true }
    })
  ]);

  const totals = positions.reduce(
    (acc, p) => {
      acc.realizedPnlUsd += Number(p.realizedPnlUsd);
      acc.unrealizedPnlUsd += Number(p.unrealizedPnlUsd);
      acc.grossNotionalUsd += Math.abs(Number(p.netQuantityUsd) * Number(p.markPrice));
      return acc;
    },
    { realizedPnlUsd: 0, unrealizedPnlUsd: 0, grossNotionalUsd: 0 }
  );

  return NextResponse.json({ totals, positions, recentFills: fills });
}
