import { NextResponse, type NextRequest } from 'next/server';
import { requireOperator } from '@/lib/guards';
import { backfillMarketNames } from '@/lib/services/opportunities';

export async function POST(request: NextRequest) {
  const guard = await requireOperator(request);
  if (!guard.ok) {
    return guard.response;
  }

  const result = await backfillMarketNames();
  return NextResponse.json({ result });
}
