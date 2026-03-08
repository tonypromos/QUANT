import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/guards';
import { listOpportunities } from '@/lib/services/opportunities';

export async function GET(request: NextRequest) {
  const guard = await requireSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const params = request.nextUrl.searchParams;
  const tag = params.get('tag');
  const limit = params.get('limit') ? Number(params.get('limit')) : undefined;
  const minLiquidity = params.get('minLiquidity') ? Number(params.get('minLiquidity')) : undefined;
  const minConfidence = params.get('minConfidence') ? Number(params.get('minConfidence')) : undefined;

  const opportunities = await listOpportunities({
    tag,
    limit,
    minLiquidity,
    minConfidence
  });

  return NextResponse.json({ opportunities });
}
