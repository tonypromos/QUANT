'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/client-api';
import type { OpportunityDto } from '@/lib/types';

type Response = { opportunities: OpportunityDto[] };
type BackfillResponse = {
  result: {
    marketsChecked: number;
    namesResolved: number;
    rowsUpdated: number;
  };
};

export function OpportunitiesTable() {
  const [rows, setRows] = useState<OpportunityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setNote(null);
    try {
      const data = await apiFetch<Response>('/api/opportunities?limit=30');
      setRows(data.opportunities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const backfillNames = async () => {
    setBackfilling(true);
    setError(null);
    setNote(null);
    try {
      const data = await apiFetch<BackfillResponse>('/api/opportunities/backfill-names', {
        method: 'POST',
        body: JSON.stringify({})
      });
      setNote(
        `Updated ${data.result.rowsUpdated} rows across ${data.result.namesResolved}/${data.result.marketsChecked} markets.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to backfill names');
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <Card className="animate-fade-slide">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ranked Opportunities</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={backfillNames} disabled={loading || backfilling}>
            {backfilling ? 'Backfilling...' : 'Backfill Names'}
          </Button>
          <Button variant="secondary" onClick={load} disabled={loading || backfilling}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {note ? <p className="mb-2 text-xs text-white/70">{note}</p> : null}
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/60">
                <th className="p-2">Market</th>
                <th className="p-2">Action</th>
                <th className="p-2">Edge</th>
                <th className="p-2">Confidence</th>
                <th className="p-2">Spread</th>
                <th className="p-2">Liquidity</th>
                <th className="p-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {!rows.length && !loading ? (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-white/60">
                    No opportunities match your current filters. In Settings, lower Minimum Liquidity, Minimum Confidence, and Edge Threshold.
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={`${row.marketId}-${row.createdAt}`} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="p-2 text-white/90">
                    <Link href={`/markets/${row.marketId}`} className="hover:text-accent hover:underline">
                      {row.marketTitle}
                    </Link>
                  </td>
                  <td className="p-2">
                    <Badge tone={row.action === 'buy_yes' ? 'success' : 'danger'}>
                      {row.action === 'buy_yes' ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                      {row.action.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="metric-value p-2">{(row.edge * 100).toFixed(2)}%</td>
                  <td className="metric-value p-2">{(row.confidence * 100).toFixed(1)}%</td>
                  <td className="metric-value p-2">{row.spread.toFixed(3)}</td>
                  <td className="metric-value p-2">${row.liquidityUsd.toLocaleString()}</td>
                  <td className="metric-value p-2">{row.score.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
