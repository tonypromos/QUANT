'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

type Props = {
  initial: {
    emailAlertsEnabled: boolean;
    paperAutotradeEnabled: boolean;
    modeDefault: 'minutes_to_hours' | 'hours_to_days';
    bankrollUsd: string;
    minLiquidityUsd: string;
    edgeThreshold: string;
    minConfidence: string;
    maxNewPositionsPerDay: string;
    maxExposurePerMarketPct: string;
    maxTotalExposurePct: string;
    whitelistTags: string[];
  };
};

export function SettingsForm({ initial }: Props) {
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(initial.emailAlertsEnabled);
  const [paperAutotradeEnabled, setPaperAutotradeEnabled] = useState(initial.paperAutotradeEnabled);
  const [modeDefault, setModeDefault] = useState(initial.modeDefault);
  const [bankrollUsd, setBankrollUsd] = useState(initial.bankrollUsd);
  const [minLiquidityUsd, setMinLiquidityUsd] = useState(initial.minLiquidityUsd);
  const [edgeThreshold, setEdgeThreshold] = useState(initial.edgeThreshold);
  const [minConfidence, setMinConfidence] = useState(initial.minConfidence);
  const [maxNewPositionsPerDay, setMaxNewPositionsPerDay] = useState(initial.maxNewPositionsPerDay);
  const [maxExposurePerMarketPct, setMaxExposurePerMarketPct] = useState(initial.maxExposurePerMarketPct);
  const [maxTotalExposurePct, setMaxTotalExposurePct] = useState(initial.maxTotalExposurePct);
  const [whitelistTags, setWhitelistTags] = useState(initial.whitelistTags.join(','));
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parseRequiredNumber = (raw: string, label: string): number => {
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must be a valid number.`);
    }
    return value;
  };

  const parseRequiredInt = (raw: string, label: string): number => {
    const value = Number(raw);
    if (!Number.isInteger(value)) {
      throw new Error(`${label} must be a whole number.`);
    }
    return value;
  };

  const applyQualityPreset = async () => {
    if (!window.confirm('Apply Signal Quality Preset? This will overwrite current thresholds.')) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const nextModeDefault: Props['initial']['modeDefault'] = 'hours_to_days';
      const nextMinLiquidityUsd = '50000';
      const nextEdgeThreshold = '0.02';
      const nextMinConfidence = '0.25';

      setModeDefault(nextModeDefault);
      setMinLiquidityUsd(nextMinLiquidityUsd);
      setEdgeThreshold(nextEdgeThreshold);
      setMinConfidence(nextMinConfidence);

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          modeDefault: nextModeDefault,
          minLiquidityUsd: Number(nextMinLiquidityUsd),
          edgeThreshold: Number(nextEdgeThreshold),
          minConfidence: Number(nextMinConfidence)
        })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Preset apply failed');
      }

      setMessage('Signal quality preset applied.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Preset apply failed');
    } finally {
      setSaving(false);
    }
  };

  const applyRealFeedWarmupPreset = async () => {
    if (!window.confirm('Apply Real Feed Warmup Preset? This will overwrite current thresholds.')) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const nextModeDefault: Props['initial']['modeDefault'] = 'minutes_to_hours';
      const nextMinLiquidityUsd = '0';
      const nextEdgeThreshold = '0.001';
      const nextMinConfidence = '0.001';
      const nextWhitelistTags = 'general,politics,macro,sports';

      setModeDefault(nextModeDefault);
      setMinLiquidityUsd(nextMinLiquidityUsd);
      setEdgeThreshold(nextEdgeThreshold);
      setMinConfidence(nextMinConfidence);
      setWhitelistTags(nextWhitelistTags);

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          modeDefault: nextModeDefault,
          minLiquidityUsd: Number(nextMinLiquidityUsd),
          edgeThreshold: Number(nextEdgeThreshold),
          minConfidence: Number(nextMinConfidence),
          whitelistTags: nextWhitelistTags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Warmup preset apply failed');
      }

      setMessage('Real-feed warmup preset applied.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Warmup preset apply failed');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const parsedMinLiquidity = parseRequiredNumber(minLiquidityUsd, 'Minimum Liquidity USD');
      const parsedEdgeThreshold = parseRequiredNumber(edgeThreshold, 'Edge Threshold');
      const parsedMinConfidence = parseRequiredNumber(minConfidence, 'Minimum Confidence');
      const parsedBankrollUsd = parseRequiredNumber(bankrollUsd, 'Bankroll USD');
      const parsedMaxNewPositionsPerDay = parseRequiredInt(maxNewPositionsPerDay, 'Max New Positions Per Day');
      const parsedMaxExposurePerMarketPct = parseRequiredNumber(maxExposurePerMarketPct, 'Max Exposure Per Market Pct');
      const parsedMaxTotalExposurePct = parseRequiredNumber(maxTotalExposurePct, 'Max Total Exposure Pct');

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          emailAlertsEnabled,
          paperAutotradeEnabled,
          modeDefault,
          bankrollUsd: parsedBankrollUsd,
          minLiquidityUsd: parsedMinLiquidity,
          edgeThreshold: parsedEdgeThreshold,
          minConfidence: parsedMinConfidence,
          maxNewPositionsPerDay: parsedMaxNewPositionsPerDay,
          maxExposurePerMarketPct: parsedMaxExposurePerMarketPct,
          maxTotalExposurePct: parsedMaxTotalExposurePct,
          whitelistTags: whitelistTags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Save failed');
      }

      setMessage('Settings updated');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleEmail = async (enabled: boolean) => {
    setEmailAlertsEnabled(enabled);
    await fetch('/api/alerts/email-toggle', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled })
    }).catch(() => {
      setMessage('Email toggle update failed');
    });
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
        <div>
          <p className="font-medium">Email Alerts</p>
          <p className="text-white/65">Optional in-app + email notifications</p>
        </div>
        <Switch checked={emailAlertsEnabled} onCheckedChange={toggleEmail} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
        <div>
          <p className="font-medium">Paper Auto-Trading</p>
          <p className="text-white/65">Run autonomous simulated orders while live mode is disabled</p>
        </div>
        <Switch checked={paperAutotradeEnabled} onCheckedChange={setPaperAutotradeEnabled} />
      </div>

      <label className="block">
        Default Mode
        <select
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2"
          value={modeDefault}
          onChange={(e) => setModeDefault(e.target.value as Props['initial']['modeDefault'])}
        >
          <option value="hours_to_days">hours_to_days</option>
          <option value="minutes_to_hours">minutes_to_hours</option>
        </select>
      </label>

      <label className="block">
        Bankroll USD
        <input
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2"
          value={bankrollUsd}
          onChange={(e) => setBankrollUsd(e.target.value)}
        />
      </label>

      <label className="block">
        Minimum Liquidity USD
        <input
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2"
          value={minLiquidityUsd}
          onChange={(e) => setMinLiquidityUsd(e.target.value)}
        />
      </label>

      <label className="block">
        Edge Threshold
        <input
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2"
          value={edgeThreshold}
          onChange={(e) => setEdgeThreshold(e.target.value)}
        />
      </label>

      <label className="block">
        Minimum Confidence
        <input
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2"
          value={minConfidence}
          onChange={(e) => setMinConfidence(e.target.value)}
        />
      </label>

      <label className="block">
        Max New Positions Per Day
        <input
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2"
          value={maxNewPositionsPerDay}
          onChange={(e) => setMaxNewPositionsPerDay(e.target.value)}
        />
      </label>

      <label className="block">
        Max Exposure Per Market Pct
        <input
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2"
          value={maxExposurePerMarketPct}
          onChange={(e) => setMaxExposurePerMarketPct(e.target.value)}
        />
      </label>

      <label className="block">
        Max Total Exposure Pct
        <input
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2"
          value={maxTotalExposurePct}
          onChange={(e) => setMaxTotalExposurePct(e.target.value)}
        />
      </label>

      <label className="block">
        Whitelist Tags (comma-separated)
        <input
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2"
          value={whitelistTags}
          onChange={(e) => setWhitelistTags(e.target.value)}
        />
      </label>

      <Button type="button" variant="secondary" onClick={applyQualityPreset} disabled={saving}>
        Apply Signal Quality Preset
      </Button>
      <Button type="button" variant="secondary" onClick={applyRealFeedWarmupPreset} disabled={saving}>
        Apply Real Feed Warmup Preset
      </Button>

      <Button onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>

      {message ? <p className="text-white/75">{message}</p> : null}
    </div>
  );
}
