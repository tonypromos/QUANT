import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { getSessionFromCookies } from '@/lib/auth';

export const requirePageSession = async () => {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/login');
  }
  return session;
};

export const requireOperatorPageSession = async () => {
  const session = await requirePageSession();
  if (session.role !== UserRole.operator_admin_nz) {
    redirect('/');
  }
  return session;
};
