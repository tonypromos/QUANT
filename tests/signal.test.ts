import { describe, expect, it } from 'vitest';
import { computePosterior, logit, sigmoid } from '@/lib/signal';

describe('signal math', () => {
  it('sigmoid and logit are roughly inverse in safe range', () => {
    const p = 0.63;
    const x = logit(p);
    expect(sigmoid(x)).toBeCloseTo(p, 6);
  });

  it('higher positive feature evidence increases posterior', () => {
    const baseline = computePosterior(0.5, {
      orderImbalance: 0,
      momentum5m: 0,
      spread: 0.01,
      volumeSpike: 0
    });

    const positive = computePosterior(0.5, {
      orderImbalance: 0.3,
      momentum5m: 0.2,
      spread: 0.01,
      volumeSpike: 0.8
    });

    expect(positive.posterior).toBeGreaterThan(baseline.posterior);
    expect(positive.edge).toBeGreaterThan(baseline.edge);
  });
});
