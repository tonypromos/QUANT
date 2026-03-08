import { NextResponse, type NextRequest } from 'next/server';

const sessionCookie = process.env.SESSION_COOKIE_NAME ?? 'quant_session';

const guardedPaths = new Set([
  '/api/bot/live/enable',
  '/api/bot/live/disable',
  '/api/bot/mode',
  '/api/settings',
  '/api/alerts/email-toggle'
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (guardedPaths.has(pathname)) {
    const token = request.cookies.get(sessionCookie)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: session required' }, { status: 401 });
    }
  }

  if (pathname === '/api/bot/kill-switch') {
    const token = request.cookies.get(sessionCookie)?.value;
    const signature = request.headers.get('x-kill-signature');
    const ts = request.headers.get('x-kill-timestamp');

    if (!token && (!signature || !ts)) {
      return NextResponse.json({ error: 'Unauthorized: session or signed request required' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/bot/live/enable',
    '/api/bot/live/disable',
    '/api/bot/mode',
    '/api/bot/kill-switch',
    '/api/settings',
    '/api/alerts/email-toggle'
  ]
};
