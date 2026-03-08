import { clamp } from '@/lib/utils';

export type SignalFeatures = {
  orderImbalance: number;
  momentum5m: number;
  spread: number;
  volumeSpike: number;
};

export type SignalWeights = {
  w1: number;
  w2: number;
  w3: number;
  w4: number;
};

const defaultWeights: SignalWeights = {
  w1: 0.9,
  w2: 0.6,
  w3: 0.5,
  w4: 0.3
};

export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

export const logit = (p: number): number => {
  const c = clamp(p, 0.01, 0.99);
  return Math.log(c / (1 - c));
};

export const computePosterior = (impliedProb: number, features: SignalFeatures, weights: SignalWeights = defaultWeights) => {
  const z =
    weights.w1 * features.orderImbalance +
    weights.w2 * features.momentum5m -
    weights.w3 * features.spread +
    weights.w4 * features.volumeSpike;

  const posterior = sigmoid(logit(impliedProb) + z);
  const confidence = clamp(Math.abs(z) / 2.5, 0, 0.99);
  const edge = posterior - impliedProb;
  const score = edge * confidence;

  return {
    posterior: clamp(posterior, 0.01, 0.99),
    edge,
    confidence,
    score,
    z
  };
};
