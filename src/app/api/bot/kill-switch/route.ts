import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest } from '@/lib/auth';
import { triggerKillSwitch } from '@/lib/services/bot';
import { UserRole } from '@prisma/client';
import { verifyKillSwitchSignature } from '@/lib/kill-switch';

const schema = z.object({
  reason: z.string().min(1).max(200)
});

export async function POST(request: NextRequest) {
  const raw = await request.text();
  let body: unknown = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const session = await getSessionFromRequest(request);
  const signature = request.headers.get('x-kill-signature') ?? '';
  const timestamp = request.headers.get('x-kill-timestamp') ?? '';

  const isOperatorSession = session?.role === UserRole.operator_admin_nz;
  const hasValidSignature = verifyKillSwitchSignature(raw, timestamp, signature);

  if (!isOperatorSession && !hasValidSignature) {
    return NextResponse.json({ error: 'Forbidden: operator session or valid signature required' }, { status: 403 });
  }

  await triggerKillSwitch(
    {
      id: session?.id,
      role: session?.role
    },
    parsed.data.reason
  );

  return NextResponse.json({ ok: true, reason: parsed.data.reason });
}
