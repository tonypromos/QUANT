import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePageSession } from '@/lib/page-auth';
import { HeaderBar } from '@/components/dashboard/header-bar';
import { NavBar } from '@/components/dashboard/nav-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MarketPage({ params }: Props) {
  await requirePageSession();
  const { id } = await params;

  const [snapshot, signals, orders] = await Promise.all([
    prisma.marketSnapshot.findFirst({ where: { marketId: id }, orderBy: { updatedAt: 'desc' } }),
    prisma.signalScore.findMany({ where: { marketId: id }, orderBy: { createdAt: 'desc' }, take: 25 }),
    prisma.liveOrder.findMany({ where: { marketId: id }, orderBy: { createdAt: 'desc' }, take: 25 })
  ]);

  if (!snapshot) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <HeaderBar />
        <NavBar />
        <Card>
          <CardContent className="py-8 text-center text-white/75">Market not found.</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <HeaderBar />
      <NavBar />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Market Deep Dive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">{snapshot.title}</h2>
          <p className="text-white/70">Tag: {snapshot.tag}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Best Bid YES" value={snapshot.bestBidYes.toString()} />
            <Metric label="Best Ask YES" value={snapshot.bestAskYes.toString()} />
            <Metric label="Implied YES" value={snapshot.impliedProbYes.toString()} />
            <Metric label="Spread" value={snapshot.spread.toString()} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latest Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {signals.map((s) => (
                <li key={s.id} className="rounded-lg border border-white/10 p-2">
                  <p className="metric-value">Posterior: {s.posteriorProbYes.toString()}</p>
                  <p className="metric-value">Edge: {s.edge.toString()}</p>
                  <p className="metric-value">Confidence: {s.confidence.toString()}</p>
                </li>
              ))}
              {!signals.length ? <li className="text-white/65">No signals yet.</li> : null}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Live Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {orders.map((o) => (
                <li key={o.id} className="rounded-lg border border-white/10 p-2">
                  <p className="metric-value">{o.side.toUpperCase()} ${o.quantityUsd.toString()} @ {o.limitPrice.toString()}</p>
                  <p className="text-white/65">{o.status} | {o.createdAt.toISOString()}</p>
                </li>
              ))}
              {!orders.length ? <li className="text-white/65">No orders yet.</li> : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5">
        <Link className="text-accent hover:underline" href="/">
          Back to opportunities
        </Link>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-wide text-white/60">{label}</p>
      <p className="metric-value text-base">{value}</p>
    </div>
  );
}
