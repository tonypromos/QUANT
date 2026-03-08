import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  process.env.KILL_SWITCH_SHARED_SECRET = 'test-secret';
});

describe('kill switch signature', () => {
  it('accepts valid signature in replay window', async () => {
    const { verifyKillSwitchSignature } = await import('@/lib/kill-switch');
    const payload = JSON.stringify({ reason: 'unit-test' });
    const timestamp = String(Date.now());
    const signature = createHmac('sha256', 'test-secret').update(`${timestamp}.${payload}`).digest('hex');

    expect(verifyKillSwitchSignature(payload, timestamp, signature)).toBe(true);
  });

  it('rejects invalid signature', async () => {
    const { verifyKillSwitchSignature } = await import('@/lib/kill-switch');
    const payload = JSON.stringify({ reason: 'unit-test' });
    const timestamp = String(Date.now());

    expect(verifyKillSwitchSignature(payload, timestamp, 'bad')).toBe(false);
  });
});
