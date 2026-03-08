import { prisma } from '@/lib/db';
import { decimalToNumber } from '@/lib/utils';
import { requirePageSession } from '@/lib/page-auth';
import { HeaderBar } from '@/components/dashboard/header-bar';
import { NavBar } from '@/components/dashboard/nav-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PortfolioPage() {
  await requirePageSession();

  const [positions, riskEvents, orders, paperPositions, paperOrders] = await Promise.all([
    prisma.livePosition.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.riskEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.liveOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.paperPosition.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.paperOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 30 })
  ]);

  const totals = positions.reduce(
    (acc, p) => {
      acc.realized += decimalToNumber(p.realizedPnlUsd);
      acc.unrealized += decimalToNumber(p.unrealizedPnlUsd);
      return acc;
    },
    { realized: 0, unrealized: 0 }
  );

  const paperTotals = paperPositions.reduce(
    (acc, p) => {
      acc.realized += decimalToNumber(p.realizedPnlUsd);
      acc.unrealized += decimalToNumber(p.unrealizedPnlUsd);
      return acc;
    },
    { realized: 0, unrealized: 0 }
  );

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <HeaderBar />
      <NavBar />

      <div className="mb-3 grid items-start gap-3 md:grid-cols-4">
        <Metric label="Live Realized" value={`$${totals.realized.toFixed(2)}`} />
        <Metric label="Live Unrealized" value={`$${totals.unrealized.toFixed(2)}`} />
        <Metric label="Paper Realized" value={`$${paperTotals.realized.toFixed(2)}`} />
        <Metric label="Paper Unrealized" value={`$${paperTotals.unrealized.toFixed(2)}`} />
      </div>

      <div className="mb-4 grid items-start gap-3 md:grid-cols-2">
        <Metric label="Open Live Positions" value={String(positions.length)} />
        <Metric label="Open Paper Positions" value={String(paperPositions.length)} />
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Card className="h-fit">
          <CardHeader className="py-2">
            <CardTitle className="text-[11px] tracking-[0.12em]">Live Positions</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-auto">
            <ul className="space-y-1.5 text-xs">
              {positions.map((p) => (
                <li key={p.id} className="rounded-lg border border-white/10 p-2">
                  <p className="font-medium">{p.marketTitle}</p>
                  <p className="metric-value">{p.side.toUpperCase()} Qty: {p.netQuantityUsd.toString()}</p>
                  <p className="metric-value">Mark: {p.markPrice.toString()} | U-PnL: {p.unrealizedPnlUsd.toString()}</p>
                </li>
              ))}
              {!positions.length ? <li className="text-white/65">No positions yet.</li> : null}
            </ul>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader className="py-2">
            <CardTitle className="text-[11px] tracking-[0.12em]">Recent Risk Events</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-auto">
            <ul className="space-y-1.5 text-xs">
              {riskEvents.map((e) => (
                <li key={e.id} className="rounded-lg border border-white/10 p-2">
                  <p className="font-medium">{e.type}</p>
                  <p className="text-white/65">{e.reason}</p>
                </li>
              ))}
              {!riskEvents.length ? <li className="text-white/65">No risk events.</li> : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-3">
        <CardHeader className="py-2">
          <CardTitle className="text-[11px] tracking-[0.12em]">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="max-h-56 overflow-auto">
          <ul className="space-y-1.5 text-xs">
            {orders.map((o) => (
              <li key={o.id} className="rounded-lg border border-white/10 p-2">
                <p className="font-medium">{o.marketTitle}</p>
                <p className="metric-value">{o.side.toUpperCase()} ${o.quantityUsd.toString()} @ {o.limitPrice.toString()}</p>
                <p className="text-white/65">{o.status}</p>
              </li>
            ))}
            {!orders.length ? <li className="text-white/65">No orders yet.</li> : null}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-3">
        <CardHeader className="py-2">
          <CardTitle className="text-[11px] tracking-[0.12em]">Recent Paper Orders</CardTitle>
        </CardHeader>
        <CardContent className="max-h-56 overflow-auto">
          <ul className="space-y-1.5 text-xs">
            {paperOrders.map((o) => (
              <li key={o.id} className="rounded-lg border border-white/10 p-2">
                <p className="font-medium">{o.marketTitle}</p>
                <p className="metric-value">
                  {o.side.toUpperCase()} ${o.quantityUsd.toString()} @ fill {o.fillPrice.toString()}
                </p>
                <p className="text-white/65">{o.createdAt.toISOString()}</p>
              </li>
            ))}
            {!paperOrders.length ? <li className="text-white/65">No paper orders yet.</li> : null}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="py-2">
        <CardTitle className="text-[11px] tracking-[0.12em]">{label}</CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <p className="metric-value text-lg">{value}</p>
      </CardContent>
    </Card>
  );
}
