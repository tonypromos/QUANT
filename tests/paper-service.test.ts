import { describe, expect, it } from 'vitest';
import { simulateConservativeFill } from '@/lib/execution/paper-service';

describe('paper fill model', () => {
  it('buy yes fills above ask with conservative slippage', () => {
    const fill = simulateConservativeFill({
      side: 'yes',
      bid: 0.42,
      ask: 0.44,
      spread: 0.02,
      orderUsd: 100,
      mode: 'hours_to_days'
    });

    expect(fill).toBeGreaterThan(0.44);
  });

  it('buy no fills below bid with conservative slippage', () => {
    const fill = simulateConservativeFill({
      side: 'no',
      bid: 0.58,
      ask: 0.6,
      spread: 0.02,
      orderUsd: 100,
      mode: 'minutes_to_hours'
    });

    expect(fill).toBeLessThan(0.58);
  });
});
