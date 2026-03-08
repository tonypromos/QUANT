import { env } from '@/lib/env';

export const sendEmailAlert = async (to: string, subject: string, body: string): Promise<{ sent: boolean; provider: string }> => {
  // Stub transport: integrate with provider SDK/API in production.
  if (!env.emailApiKey) {
    return { sent: false, provider: 'disabled' };
  }

  void to;
  void subject;
  void body;
  return { sent: true, provider: 'configured' };
};
