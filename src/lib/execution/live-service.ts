import { BotMode, OrderSide, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/db';

export type NewLiveOrderInput = {
  marketId: string;
  marketTitle: string;
  tag: string;
  side: OrderSide;
  quantityUsd: number;
  limitPrice: number;
  ttlSec: number;
  reason: string;
  mode: BotMode;
};

// This service intentionally stores execution intents and lifecycle state.
// Actual exchange connectivity should be implemented in the worker runtime.
export const createLiveOrder = async (input: NewLiveOrderInput) =>
  prisma.liveOrder.create({
    data: {
      marketId: input.marketId,
      marketTitle: input.marketTitle,
      tag: input.tag,
      side: input.side,
      quantityUsd: input.quantityUsd,
      limitPrice: input.limitPrice,
      ttlSec: input.ttlSec,
      reason: input.reason,
      mode: input.mode,
      status: OrderStatus.pending
    }
  });

export const cancelStaleOpenOrders = async () => {
  const now = Date.now();
  const openOrders = await prisma.liveOrder.findMany({
    where: {
      status: {
        in: [OrderStatus.pending, OrderStatus.open, OrderStatus.partially_filled]
      }
    }
  });

  const staleIds = openOrders
    .filter((o) => now - o.createdAt.getTime() > o.ttlSec * 1000)
    .map((o) => o.id);

  if (!staleIds.length) {
    return 0;
  }

  const updated = await prisma.liveOrder.updateMany({
    where: { id: { in: staleIds } },
    data: { status: OrderStatus.canceled }
  });

  return updated.count;
};
