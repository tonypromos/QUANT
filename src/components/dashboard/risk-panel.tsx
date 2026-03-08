'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/client-api';

type RiskResponse = {
  risk: {
    bankrollUsd: number;
    totalExposurePct: number;
    dailyRealizedPnlUsd: number;
    dailyLossPct: number;
    staleData: boolean;
    canOpenNewPosition: boolean;
  };
  stopCheck: {
    tripped: boolean;
    threshold: number;
    dailyLossPct: number;
  };
};

export function RiskPanel() {
  const [data, setData] = useState<RiskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await apiFetch<RiskResponse>('/api/risk');
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load risk');
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-danger">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-slide">
      <CardHeader>
        <CardTitle>Risk Guardrails</CardTitle>
      </CardHeader>
      <CardContent>
        {!data ? (
          <p className="text-sm text-white/70">Loading risk snapshot...</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Badge tone={data.risk.canOpenNewPosition ? 'success' : 'danger'}>
                {data.risk.canOpenNewPosition ? 'Entry Allowed' : 'Entry Blocked'}
              </Badge>
              <Badge tone={data.risk.staleData ? 'warn' : 'success'}>{data.risk.staleData ? 'Data Stale' : 'Data Fresh'}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-white/60">Bankroll</p>
                <p className="metric-value text-lg">${data.risk.bankrollUsd.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-white/60">Exposure</p>
                <p className="metric-value text-lg">{(data.risk.totalExposurePct * 100).toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-white/60">Daily PnL</p>
                <p className="metric-value text-lg">${data.risk.dailyRealizedPnlUsd.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-white/60">Daily Loss</p>
                <p className="metric-value text-lg">{(data.risk.dailyLossPct * 100).toFixed(2)}%</p>
              </div>
            </div>

            {data.stopCheck.tripped ? (
              <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/15 p-2 text-danger">
                <AlertTriangle className="h-4 w-4" />
                Daily loss stop breached.
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
