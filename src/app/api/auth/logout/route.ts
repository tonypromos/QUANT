import { NextResponse, type NextRequest } from 'next/server';
import { deleteSessionByToken } from '@/lib/auth';
import { env } from '@/lib/env';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(env.sessionCookieName)?.value;
  await deleteSessionByToken(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(env.sessionCookieName, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  return response;
}
