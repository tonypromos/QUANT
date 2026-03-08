import { OrderSide } from '@prisma/client';
import { prisma } from '@/lib/db';
import { decimalToNumber } from '@/lib/utils';
import { requirePageSession } from '@/lib/page-auth';
import { HeaderBar } from '@/components/dashboard/header-bar';
import { NavBar } from '@/components/dashboard/nav-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type OrderWithDerived = {
  id: string;
  marketId: string;
  marketTitle: string;
  side: OrderSide;
  quantityUsd: number;
  fillPrice: number;
  reason: string;
  createdAt: Date;
  derivedType: 'open' | 'close';
  derivedRealizedUsd: number;
};

type PositionState = {
  qty: number;
  avg: number;
};

const isExitReason = (reason: string): boolean => reason.startsWith('auto_exit_');

const computeRealizedForExit = (side: OrderSide, avg: number, fill: number, qty: number): number => {
  if (side === OrderSide.yes) {
    return (fill - avg) * qty;
  }
  return (avg - fill) * qty;
};

const derivePaperOrderPnL = (
  orders: Array<{
    id: string;
    marketId: string;
    marketTitle: string;
    side: OrderSide;
    quantityUsd: unknown;
    fillPrice: unknown;
    reason: string;
    createdAt: Date;
  }>
): OrderWithDerived[] => {
  const states = new Map<string, PositionState>();

  return orders.map((o) => {
    const key = `${o.marketId}:${o.side}`;
    const state = states.get(key) ?? { qty: 0, avg: decimalToNumber(o.fillPrice) };

    const qty = decimalToNumber(o.quantityUsd);
    const fill = decimalToNumber(o.fillPrice);
    const closing = isExitReason(o.reason);

    if (!closing) {
      const newQty = state.qty + qty;
      const newAvg = newQty > 0 ? (state.avg * state.qty + fill * qty) / newQty : fill;
      states.set(key, { qty: newQty, avg: newAvg });
      return {
        id: o.id,
        marketId: o.marketId,
        marketTitle: o.marketTitle,
        side: o.side,
        quantityUsd: qty,
        fillPrice: fill,
        reason: o.reason,
        createdAt: o.createdAt,
        derivedType: 'open',
        derivedRealizedUsd: 0
      };
    }

    const closeQty = Math.min(qty, state.qty || qty);
    const realized = computeRealizedForExit(o.side, state.avg, fill, closeQty);
    const remainingQty = Math.max(0, state.qty - closeQty);
    states.set(key, { qty: remainingQty, avg: state.avg });

    return {
      id: o.id,
      marketId: o.marketId,
      marketTitle: o.marketTitle,
      side: o.side,
      quantityUsd: qty,
      fillPrice: fill,
      reason: o.reason,
      createdAt: o.createdAt,
      derivedType: 'close',
      derivedRealizedUsd: realized
    };
  });
};

export default async function TradesPage() {
  await requirePageSession();

  const [paperPositions, paperOrdersRaw, liveOrders] = await Promise.all([
    prisma.paperPosition.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.paperOrder.findMany({ orderBy: { createdAt: 'asc' }, take: 400 }),
    prisma.liveOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 60 })
  ]);

  const paperOrdersDerived = derivePaperOrderPnL(
    paperOrdersRaw.map((o) => ({
      id: o.id,
      marketId: o.marketId,
      marketTitle: o.marketTitle,
      side: o.side,
      quantityUsd: o.quantityUsd,
      fillPrice: o.fillPrice,
      reason: o.reason,
      createdAt: o.createdAt
    }))
  );

  const recentPaperOrders = [...paperOrdersDerived].reverse().slice(0, 60);

  const openPaper = paperPositions.filter((p) => decimalToNumber(p.netQuantityUsd) > 0);
  const closedPaper = paperPositions.filter((p) => decimalToNumber(p.netQuantityUsd) === 0);

  const realizedFromOrdersUsd = paperOrdersDerived.reduce((acc, o) => acc + o.derivedRealizedUsd, 0);

  const summary = {
    openCount: openPaper.length,
    closedCount: closedPaper.length,
    realizedTotalUsd: realizedFromOrdersUsd,
    unrealizedOpenUsd: openPaper.reduce((acc, p) => acc + decimalToNumber(p.unrealizedPnlUsd), 0)
  };

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      <HeaderBar />
      <NavBar />

      <div className="mb-3 grid items-start gap-3 md:grid-cols-4">
        <Metric label="Open Paper Positions" value={String(summary.openCount)} />
        <Metric label="Total Realized PnL" value={`$${summary.realizedTotalUsd.toFixed(2)}`} tone={summary.realizedTotalUsd >= 0 ? 'pos' : 'neg'} />
        <Metric label="Closed Paper Positions" value={String(summary.closedCount)} />
        <Metric label="Open Unrealized PnL" value={`$${summary.unrealizedOpenUsd.toFixed(2)}`} tone={summary.unrealizedOpenUsd >= 0 ? 'pos' : 'neg'} />
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Open Paper Positions</CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-auto">
            <ul className="space-y-1.5 text-xs">
              {openPaper.map((p) => (
                <li key={p.id} className="rounded-lg border border-white/10 p-2">
                  <p className="font-medium text-sm">{p.marketTitle}</p>
                  <p className="metric-value">{p.side.toUpperCase()} qty ${decimalToNumber(p.netQuantityUsd).toFixed(2)}</p>
                  <p className="metric-value">Avg {decimalToNumber(p.avgPrice).toFixed(4)} | Mark {decimalToNumber(p.markPrice).toFixed(4)}</p>
                  <p className={`metric-value ${decimalToNumber(p.unrealizedPnlUsd) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    Unrealized ${decimalToNumber(p.unrealizedPnlUsd).toFixed(2)}
                  </p>
                </li>
              ))}
              {!openPaper.length ? <li className="text-white/65">No open paper positions.</li> : null}
            </ul>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Closed Paper Positions</CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-auto">
            <ul className="space-y-1.5 text-xs">
              {closedPaper.map((p) => (
                <li key={p.id} className="rounded-lg border border-white/10 p-2">
                  <p className="font-medium text-sm">{p.marketTitle}</p>
                  <p className="metric-value">{p.side.toUpperCase()} closed</p>
                  <p className={`metric-value ${decimalToNumber(p.realizedPnlUsd) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    Realized ${decimalToNumber(p.realizedPnlUsd).toFixed(2)}
                  </p>
                </li>
              ))}
              {!closedPaper.length ? <li className="text-white/65">No closed paper positions yet.</li> : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Recent Paper Orders</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[24rem] overflow-auto">
            <ul className="space-y-1.5 text-xs">
              {recentPaperOrders.map((o) => (
                <li key={o.id} className="rounded-lg border border-white/10 p-2">
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-sm">{o.marketTitle}</p>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${o.derivedType === 'close' ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'}`}>
                      {o.derivedType === 'close' ? 'CLOSE' : 'OPEN'}
                    </span>
                  </div>
                  <p className="metric-value">{o.side.toUpperCase()} ${o.quantityUsd.toFixed(2)} @ {o.fillPrice.toFixed(4)}</p>
                  {o.derivedType === 'close' ? (
                    <p className={`metric-value ${o.derivedRealizedUsd >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      Realized {o.derivedRealizedUsd >= 0 ? '+' : ''}${o.derivedRealizedUsd.toFixed(2)}
                    </p>
                  ) : null}
                  <p className="text-white/65">{o.reason} | {o.createdAt.toISOString()}</p>
                </li>
              ))}
              {!recentPaperOrders.length ? <li className="text-white/65">No paper orders.</li> : null}
            </ul>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Recent Live Orders</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[24rem] overflow-auto">
            <ul className="space-y-1.5 text-xs">
              {liveOrders.map((o) => (
                <li key={o.id} className="rounded-lg border border-white/10 p-2">
                  <p className="font-medium text-sm">{o.marketTitle}</p>
                  <p className="metric-value">{o.side.toUpperCase()} ${decimalToNumber(o.quantityUsd).toFixed(2)} @ {decimalToNumber(o.limitPrice).toFixed(4)}</p>
                  <p className="text-white/65">{o.status} | {o.createdAt.toISOString()}</p>
                </li>
              ))}
              {!liveOrders.length ? <li className="text-white/65">No live orders yet.</li> : null}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'pos' | 'neg' }) {
  const toneClass = tone === 'pos' ? 'text-green-300' : tone === 'neg' ? 'text-red-300' : 'text-white/95';

  return (
    <Card>
      <CardHeader className="py-2">
        <CardTitle className="text-[11px] tracking-[0.12em]">{label}</CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <p className={`metric-value text-lg ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
