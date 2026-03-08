import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireOperator } from '@/lib/guards';
import { disableLiveBot } from '@/lib/services/bot';

const schema = z.object({
  reason: z.string().min(1).max(200).optional()
});

export async function POST(request: NextRequest) {
  const guard = await requireOperator(request);
  if (!guard.ok) {
    return guard.response;
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  await disableLiveBot(
    {
      id: guard.session.id,
      role: guard.session.role
    },
    parsed.data.reason ?? 'manual_disable'
  );

  return NextResponse.json({ ok: true });
}
