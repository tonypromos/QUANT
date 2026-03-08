# Signal Model

## Summary

The current signal model is a simple heuristic scoring function. It is not presented as a validated quantitative model, and it should not be treated as one.

Its job is to:

- start from market implied probability
- apply a weighted feature adjustment
- produce a posterior estimate, edge, confidence, and score
- rank opportunities for paper or live decision logic

The implementation lives in [src/lib/signal.ts](/Users/tonylaughton/AI-Coding/QUANT/src/lib/signal.ts), and the worker applies it in [worker/src/index.ts](/Users/tonylaughton/AI-Coding/QUANT/worker/src/index.ts).

## Inputs

The model takes:

- `impliedProb`
- `orderImbalance`
- `momentum5m`
- `spread`
- `volumeSpike`

In the worker, those currently come from:

- `impliedProbYes = (bestBidYes + bestAskYes) / 2`
- `spread = max(0.0001, bestAskYes - bestBidYes)`
- `orderImbalance = tick.orderImbalance`
- `momentum5m = (Math.random() - 0.5) * 0.2`
- `volumeSpike = min(2, volume5m / 5000)`

That `momentum5m` term is important: it is currently synthetic noise rather than a measured five-minute momentum calculation. This is a prototype artifact, not a robust feature engineering choice.

## Formula

The model computes:

```ts
z =
  0.9 * orderImbalance +
  0.6 * momentum5m -
  0.5 * spread +
  0.3 * volumeSpike
```

Then:

```ts
posterior = sigmoid(logit(impliedProb) + z)
confidence = clamp(Math.abs(z) / 2.5, 0, 0.99)
edge = posterior - impliedProb
score = edge * confidence
```

The output posterior is clamped into the `[0.01, 0.99]` range.

## Interpretation

- `posterior`: the model-adjusted estimate of yes probability
- `edge`: how far the model estimate is from market implied probability
- `confidence`: a bounded strength measure based on the magnitude of `z`
- `score`: ranking value used to sort opportunities

This is better thought of as a ranking heuristic than a probability model with known calibration quality.

## How the worker uses it

For each market tick, the worker:

1. computes a signal
2. stores `posterior`, `edge`, `confidence`, and `score`
3. creates an opportunity row
4. chooses `buy_yes` when `edge >= 0`, otherwise `buy_no`

Later, autonomous selection filters opportunities using settings such as:

- minimum confidence
- minimum absolute edge
- maximum spread
- liquidity threshold
- optional tag whitelist

Among eligible opportunities, the worker prefers the highest `score`.

## Sizing logic

The worker also uses the signal outputs in a simple sizing heuristic:

```ts
spreadPenalty = max(0.2, 1 - spread * 10)
rawSize =
  bankroll *
  maxExposurePerMarketPct *
  abs(edge) *
  confidence *
  spreadPenalty *
  10
```

That value is then clamped into a minimum and maximum order size.

This again is heuristic sizing, not a portfolio-optimized execution model.

## Current limitations

- Weights are hand-tuned constants, not learned parameters
- There is no documented backtest or calibration process in the repo
- `momentum5m` is currently synthetic
- `score` is not expected value, Sharpe, or a formal utility metric
- `confidence` is derived from feature magnitude, not empirical prediction reliability
- The model uses a small set of market microstructure-style inputs and ignores richer context

One implementation detail to be aware of: the worker persists `momentum5m: 0` in `featureJson` even though a synthetic momentum term is used during scoring. That mismatch is another sign that the current model is still prototype-stage.

## Recommended next steps

If someone wants to improve the model, the sensible order is:

1. replace synthetic momentum with a real measured feature
2. persist the actual feature values used for scoring
3. add offline evaluation and calibration
4. separate ranking logic from sizing logic
5. compare the heuristic model against simpler and more explicit baselines

## Bottom line

The current signal model is useful as a transparent starting point for experimentation.

It is not a claim of durable alpha, not a finished quantitative research stack, and not enough on its own to justify real-money deployment.
