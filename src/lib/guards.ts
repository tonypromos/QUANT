import { NextResponse, type NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { getSessionFromRequest } from '@/lib/auth';
import type { SessionUser } from '@/lib/types';

export type GuardResult =
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse };

export const requireSession = async (request: NextRequest): Promise<GuardResult> => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }
  return { ok: true, session };
};

export const requireOperator = async (request: NextRequest): Promise<GuardResult> => {
  const sessionResult = await requireSession(request);
  if (!sessionResult.ok) {
    return sessionResult;
  }

  if (sessionResult.session.role !== UserRole.operator_admin_nz) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden: operator role required' }, { status: 403 })
    };
  }

  return sessionResult;
};
