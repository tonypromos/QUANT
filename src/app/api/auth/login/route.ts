import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateCredentials, createSession } from '@/lib/auth';
import { env } from '@/lib/env';
import { writeAuditEvent } from '@/lib/audit';

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { username, password } = parsed.data;
  const role = authenticateCredentials(username, password);
  if (!role) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await createSession(username, role);
  await writeAuditEvent({
    actorRole: role,
    action: 'auth.login',
    targetType: 'Session',
    detailsJson: { username }
  });

  const response = NextResponse.json({ ok: true, role, username });
  response.cookies.set(env.sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: env.sessionTtlHours * 60 * 60,
    path: '/'
  });

  return response;
}
