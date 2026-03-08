import { BotMode, OrderSide } from '@prisma/client';
import { clamp } from '@/lib/utils';

type PaperFillInput = {
  side: OrderSide;
  bid: number;
  ask: number;
  spread: number;
  orderUsd: number;
  mode: BotMode;
};

export const simulateConservativeFill = (input: PaperFillInput): number => {
  const impact = 0.0005 * (input.orderUsd / 1000);
  const slippage = Math.max(0.005, 0.25 * input.spread) + impact;

  if (input.side === 'yes') {
    return clamp(input.ask + slippage, 0.001, 0.999);
  }

  return clamp(input.bid - slippage, 0.001, 0.999);
};
