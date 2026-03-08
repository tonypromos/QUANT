import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { getOrCreateBotState, getOrCreateSettings } from '@/lib/repository';
import type { PreflightResult } from '@/lib/types';

export const runPreflightChecks = async (): Promise<PreflightResult> => {
  const [settings, botState, heartbeat, latestSnapshot] = await Promise.all([
    getOrCreateSettings(),
    getOrCreateBotState(),
    prisma.workerHeartbeat.findUnique({ where: { source: 'polymarket-worker' } }),
    prisma.marketSnapshot.findFirst({ orderBy: { updatedAt: 'desc' } })
  ]);

  const checks = [
    {
      key: 'wallet_key' as const,
      ok: Boolean(env.liveWalletKeyRef),
      detail: env.liveWalletKeyRef ? 'LIVE_WALLET_KEY_REF configured.' : 'LIVE_WALLET_KEY_REF missing.'
    },
    {
      key: 'api_credentials' as const,
      ok: Boolean(env.polymarketApiKey && env.polymarketApiSecret && env.polymarketApiPassphrase && env.polymarketProfileKey),
      detail:
        env.polymarketApiKey && env.polymarketApiSecret && env.polymarketApiPassphrase && env.polymarketProfileKey
          ? 'Polymarket API credentials configured.'
          : 'Polymarket API credentials missing (key/secret/passphrase/profile key).'
    },
    {
      key: 'risk_limits' as const,
      ok: settings.riskLimitsConfigured,
      detail: settings.riskLimitsConfigured ? 'Risk limits loaded.' : 'Risk limits not configured.'
    },
    {
      key: 'worker_healthy' as const,
      ok: Boolean(heartbeat && Date.now() - heartbeat.lastSeenAt.getTime() <= 15_000),
      detail: heartbeat ? `Last heartbeat: ${heartbeat.lastSeenAt.toISOString()}` : 'No heartbeat found.'
    },
    {
      key: 'fresh_data' as const,
      ok: Boolean(latestSnapshot && Date.now() - latestSnapshot.updatedAt.getTime() <= 15_000),
      detail: latestSnapshot ? `Latest market snapshot: ${latestSnapshot.updatedAt.toISOString()}` : 'No market snapshot found.'
    },
    {
      key: 'kill_switch' as const,
      ok: !botState.killSwitchActive,
      detail: botState.killSwitchActive ? 'Kill switch active.' : 'Kill switch is inactive.'
    }
  ];

  return {
    pass: checks.every((check) => check.ok),
    checks
  };
};
