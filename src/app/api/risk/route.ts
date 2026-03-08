import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/guards';
import { getRiskSnapshot, checkDailyLossStop } from '@/lib/risk';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const guard = await requireSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const [risk, stopCheck, recentRiskEvents] = await Promise.all([
    getRiskSnapshot(),
    checkDailyLossStop(),
    prisma.riskEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })
  ]);

  return NextResponse.json({
    risk,
    stopCheck,
    recentRiskEvents
  });
}
