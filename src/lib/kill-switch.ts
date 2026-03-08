import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

export const verifyKillSwitchSignature = (payload: string, timestamp: string, signature: string): boolean => {
  if (!timestamp || !signature) {
    return false;
  }

  const now = Date.now();
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return false;
  }

  // 5 minute replay window.
  if (Math.abs(now - ts) > 5 * 60 * 1000) {
    return false;
  }

  const computed = createHmac('sha256', env.killSwitchSharedSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  const expected = Buffer.from(computed);
  const received = Buffer.from(signature);

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
};
