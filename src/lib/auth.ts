import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import type { SessionUser } from '@/lib/types';

const hashToken = (value: string): string => createHash('sha256').update(value).digest('hex');

const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ab, bb);
};

const credentialsMap: Record<string, { password: string; role: UserRole }> = {
  [env.operatorUsername]: { password: env.operatorPassword, role: UserRole.operator_admin_nz },
  [env.analystUsername]: { password: env.analystPassword, role: UserRole.analyst_readonly }
};

export const authenticateCredentials = (username: string, password: string): UserRole | null => {
  const found = credentialsMap[username];
  if (!found) {
    return null;
  }
  return safeEqual(password, found.password) ? found.role : null;
};

export const createSession = async (username: string, role: UserRole): Promise<string> => {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash,
      role,
      username,
      expiresAt
    }
  });

  return token;
};

export const deleteSessionByToken = async (token?: string | null): Promise<void> => {
  if (!token) {
    return;
  }
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
};

export const getSessionFromRequest = async (request: NextRequest): Promise<SessionUser | null> => {
  const token = request.cookies.get(env.sessionCookieName)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() }
  });

  return {
    id: session.id,
    username: session.username,
    role: session.role,
    expiresAt: session.expiresAt
  };
};

export const getSessionFromCookies = async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.sessionCookieName)?.value;
  if (!token) {
    return null;
  }
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  return {
    id: session.id,
    username: session.username,
    role: session.role,
    expiresAt: session.expiresAt
  };
};
