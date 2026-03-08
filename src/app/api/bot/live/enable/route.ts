import { NextResponse, type NextRequest } from 'next/server';
import { requireOperator } from '@/lib/guards';
import { enableLiveBot } from '@/lib/services/bot';

export async function POST(request: NextRequest) {
  const guard = await requireOperator(request);
  if (!guard.ok) {
    return guard.response;
  }

  const result = await enableLiveBot({
    id: guard.session.id,
    role: guard.session.role
  });

  if (!result.enabled) {
    return NextResponse.json({ error: 'Preflight failed', preflight: result.preflight }, { status: 409 });
  }

  return NextResponse.json({ ok: true, preflight: result.preflight });
}
