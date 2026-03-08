import type { BotMode, UserRole } from '@prisma/client';

export type AppRole = UserRole;

export type SessionUser = {
  id: string;
  username: string;
  role: AppRole;
  expiresAt: Date;
};

export type EligibilityCheckResult = {
  allowed: boolean;
  reason?: string;
};

export type PreflightCheck = {
  key: 'wallet_key' | 'api_credentials' | 'risk_limits' | 'worker_healthy' | 'fresh_data' | 'kill_switch';
  ok: boolean;
  detail: string;
};

export type PreflightResult = {
  pass: boolean;
  checks: PreflightCheck[];
};

export type OpportunityDto = {
  marketId: string;
  marketTitle: string;
  tag: string;
  action: 'buy_yes' | 'buy_no';
  liquidityUsd: number;
  spread: number;
  impliedProbYes: number;
  posteriorProbYes: number;
  edge: number;
  confidence: number;
  score: number;
  createdAt: string;
};

export type BotStatusDto = {
  liveEnabled: boolean;
  mode: BotMode;
  killSwitchActive: boolean;
  haltedReason: string | null;
  lastPreflightAt: string | null;
  lastDecisionAt: string | null;
  workerHealthy: boolean;
  dataFresh: boolean;
  paperOrders24h: number;
  liveOrders24h: number;
  opportunities1h: number;
  lastPaperOrderAt: string | null;
  lastLiveOrderAt: string | null;
};
