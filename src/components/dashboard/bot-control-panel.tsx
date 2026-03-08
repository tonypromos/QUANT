'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/client-api';
import type { BotStatusDto } from '@/lib/types';

type StatusResponse = { status: BotStatusDto };
type PaperOrdersResponse = {
  orders: Array<{
    id: string;
    marketTitle: string;
    side: 'yes' | 'no';
    quantityUsd: string;
    fillPrice: string;
    createdAt: string;
  }>;
};

export function BotControlPanel() {
  const [status, setStatus] = useState<BotStatusDto | null>(null);
  const [paperOrders, setPaperOrders] = useState<PaperOrdersResponse['orders']>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [statusData, paperData] = await Promise.all([
        apiFetch<StatusResponse>('/api/bot/status'),
        apiFetch<PaperOrdersResponse>('/api/paper/orders')
      ]);
      setStatus(statusData.status);
      setPaperOrders(paperData.orders.slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bot status');
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const post = async (path: string, body: Record<string, unknown> = {}) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="animate-fade-slide">
      <CardHeader>
        <CardTitle>Autonomous Bot Control</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Badge tone={status.liveEnabled ? 'success' : 'default'}>{status.liveEnabled ? 'Live Enabled' : 'Live Disabled'}</Badge>
              <Badge tone={status.killSwitchActive ? 'danger' : 'success'}>
                {status.killSwitchActive ? 'Kill Switch Active' : 'Kill Switch Clear'}
              </Badge>
              <Badge tone={status.workerHealthy ? 'success' : 'warn'}>
                {status.workerHealthy ? 'Worker Healthy' : 'Worker Stale'}
              </Badge>
              <Badge tone={status.dataFresh ? 'success' : 'warn'}>{status.dataFresh ? 'Data Fresh' : 'Data Stale'}</Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button disabled={busy} onClick={() => post('/api/bot/live/enable')}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Enable Live
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => post('/api/bot/live/disable', { reason: 'manual_disable' })}>
                <ShieldAlert className="mr-2 h-4 w-4" /> Disable Live
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => post('/api/bot/mode', { mode: 'minutes_to_hours' })}>
                <Zap className="mr-2 h-4 w-4" /> Mode: Minutes-Hours
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => post('/api/bot/mode', { mode: 'hours_to_days' })}>
                <Zap className="mr-2 h-4 w-4" /> Mode: Hours-Days
              </Button>
            </div>

            <Button
              variant="danger"
              disabled={busy}
              className="w-full"
              onClick={() => post('/api/bot/kill-switch', { reason: 'manual_ui_kill_switch' })}
            >
              Trigger Kill Switch
            </Button>

            <Button variant="secondary" disabled={busy} className="w-full" onClick={() => post('/api/paper/run-once')}>
              Run One Paper Trade
            </Button>

            <div className="text-xs text-white/65">
              <p>Mode: <span className="metric-value">{status.mode}</span></p>
              <p>Halt Reason: <span className="metric-value">{status.haltedReason ?? 'none'}</span></p>
              <p>Paper Orders (24h): <span className="metric-value">{status.paperOrders24h}</span></p>
              <p>Live Orders (24h): <span className="metric-value">{status.liveOrders24h}</span></p>
              <p>Opportunities (1h): <span className="metric-value">{status.opportunities1h}</span></p>
              <p>Last Paper Order: <span className="metric-value">{status.lastPaperOrderAt ?? 'none'}</span></p>
              <p>Last Live Order: <span className="metric-value">{status.lastLiveOrderAt ?? 'none'}</span></p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
              <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Recent Paper Trades</p>
              <ul className="space-y-1 text-xs">
                {paperOrders.length ? (
                  paperOrders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2 rounded border border-white/10 px-2 py-1">
                      <span className="truncate text-white/80">{o.marketTitle}</span>
                      <span className="metric-value text-white/90">
                        {o.side.toUpperCase()} ${Number(o.quantityUsd).toFixed(2)}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-white/60">No paper trades yet.</li>
                )}
              </ul>
            </div>
          </>
        ) : (
          <p className="text-sm text-white/70">Loading bot status...</p>
        )}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
