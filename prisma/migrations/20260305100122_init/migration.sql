-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('operator_admin_nz', 'analyst_readonly');

-- CreateEnum
CREATE TYPE "BotMode" AS ENUM ('minutes_to_hours', 'hours_to_days');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('yes', 'no');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'open', 'partially_filled', 'filled', 'canceled', 'rejected');

-- CreateEnum
CREATE TYPE "RiskEventType" AS ENUM ('daily_loss_stop', 'stale_data_halt', 'volatility_halt', 'manual_kill_switch', 'auto_kill_switch', 'preflight_fail');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "emailAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paperAutotradeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "riskLimitsConfigured" BOOLEAN NOT NULL DEFAULT true,
    "modeDefault" "BotMode" NOT NULL DEFAULT 'hours_to_days',
    "minLiquidityUsd" DECIMAL(18,6) NOT NULL DEFAULT 50000,
    "maxSpread" DECIMAL(18,6) NOT NULL DEFAULT 0.03,
    "edgeThreshold" DECIMAL(18,6) NOT NULL DEFAULT 0.03,
    "minConfidence" DECIMAL(18,6) NOT NULL DEFAULT 0.65,
    "maxExposurePerMarketPct" DECIMAL(18,6) NOT NULL DEFAULT 0.02,
    "maxExposurePerTagPct" DECIMAL(18,6) NOT NULL DEFAULT 0.06,
    "maxTotalExposurePct" DECIMAL(18,6) NOT NULL DEFAULT 0.20,
    "dailyLossStopPct" DECIMAL(18,6) NOT NULL DEFAULT 0.02,
    "maxNewPositionsPerDay" INTEGER NOT NULL DEFAULT 25,
    "orderTtlSecMin" INTEGER NOT NULL DEFAULT 30,
    "orderTtlSecMax" INTEGER NOT NULL DEFAULT 120,
    "bankrollUsd" DECIMAL(18,6) NOT NULL DEFAULT 300,
    "whitelistTags" TEXT[] DEFAULT ARRAY['politics', 'macro', 'sports']::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "liveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" "BotMode" NOT NULL DEFAULT 'hours_to_days',
    "killSwitchActive" BOOLEAN NOT NULL DEFAULT false,
    "haltedReason" TEXT,
    "lastPreflightAt" TIMESTAMP(3),
    "lastDecisionAt" TIMESTAMP(3),
    "lastOrderAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerHeartbeat" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detailsJson" JSONB,

    CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSnapshot" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "liquidityUsd" DECIMAL(18,6) NOT NULL,
    "spread" DECIMAL(18,6) NOT NULL,
    "impliedProbYes" DECIMAL(18,6) NOT NULL,
    "bestBidYes" DECIMAL(18,6) NOT NULL,
    "bestAskYes" DECIMAL(18,6) NOT NULL,
    "volume5m" DECIMAL(18,6) NOT NULL,
    "orderImbalance" DECIMAL(18,6) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalScore" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "impliedProbYes" DECIMAL(18,6) NOT NULL,
    "posteriorProbYes" DECIMAL(18,6) NOT NULL,
    "edge" DECIMAL(18,6) NOT NULL,
    "confidence" DECIMAL(18,6) NOT NULL,
    "score" DECIMAL(18,6) NOT NULL,
    "featureJson" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignalScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "marketTitle" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "liquidityUsd" DECIMAL(18,6) NOT NULL,
    "spread" DECIMAL(18,6) NOT NULL,
    "impliedProbYes" DECIMAL(18,6) NOT NULL,
    "posteriorProbYes" DECIMAL(18,6) NOT NULL,
    "edge" DECIMAL(18,6) NOT NULL,
    "confidence" DECIMAL(18,6) NOT NULL,
    "score" DECIMAL(18,6) NOT NULL,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveOrder" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "marketTitle" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "quantityUsd" DECIMAL(18,6) NOT NULL,
    "limitPrice" DECIMAL(18,6) NOT NULL,
    "ttlSec" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT NOT NULL,
    "mode" "BotMode" NOT NULL,
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveFill" (
    "id" TEXT NOT NULL,
    "liveOrderId" TEXT NOT NULL,
    "fillPrice" DECIMAL(18,6) NOT NULL,
    "quantityUsd" DECIMAL(18,6) NOT NULL,
    "feeUsd" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveFill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivePosition" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "marketTitle" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "netQuantityUsd" DECIMAL(18,6) NOT NULL,
    "avgPrice" DECIMAL(18,6) NOT NULL,
    "markPrice" DECIMAL(18,6) NOT NULL,
    "unrealizedPnlUsd" DECIMAL(18,6) NOT NULL,
    "realizedPnlUsd" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LivePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperOrder" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "marketTitle" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "quantityUsd" DECIMAL(18,6) NOT NULL,
    "fillPrice" DECIMAL(18,6) NOT NULL,
    "impliedProbYes" DECIMAL(18,6) NOT NULL,
    "reason" TEXT NOT NULL,
    "mode" "BotMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperFill" (
    "id" TEXT NOT NULL,
    "paperOrderId" TEXT NOT NULL,
    "fillPrice" DECIMAL(18,6) NOT NULL,
    "quantityUsd" DECIMAL(18,6) NOT NULL,
    "feeUsd" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperFill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperPosition" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "marketTitle" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "netQuantityUsd" DECIMAL(18,6) NOT NULL,
    "avgPrice" DECIMAL(18,6) NOT NULL,
    "markPrice" DECIMAL(18,6) NOT NULL,
    "unrealizedPnlUsd" DECIMAL(18,6) NOT NULL,
    "realizedPnlUsd" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskEvent" (
    "id" TEXT NOT NULL,
    "type" "RiskEventType" NOT NULL,
    "reason" TEXT NOT NULL,
    "detailsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "trainedOnFrom" TIMESTAMP(3) NOT NULL,
    "trainedOnTo" TIMESTAMP(3) NOT NULL,
    "calibrationEce" DECIMAL(18,6) NOT NULL,
    "brierScore" DECIMAL(18,6) NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorRole" "UserRole",
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "detailsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerHeartbeat_source_key" ON "WorkerHeartbeat"("source");

-- CreateIndex
CREATE INDEX "MarketSnapshot_marketId_updatedAt_idx" ON "MarketSnapshot"("marketId", "updatedAt");

-- CreateIndex
CREATE INDEX "SignalScore_marketId_createdAt_idx" ON "SignalScore"("marketId", "createdAt");

-- CreateIndex
CREATE INDEX "SignalScore_createdAt_idx" ON "SignalScore"("createdAt");

-- CreateIndex
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");

-- CreateIndex
CREATE INDEX "Opportunity_marketId_createdAt_idx" ON "Opportunity"("marketId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveOrder_createdAt_idx" ON "LiveOrder"("createdAt");

-- CreateIndex
CREATE INDEX "LiveOrder_status_createdAt_idx" ON "LiveOrder"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LivePosition_marketId_side_key" ON "LivePosition"("marketId", "side");

-- CreateIndex
CREATE INDEX "PaperOrder_createdAt_idx" ON "PaperOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaperPosition_marketId_side_key" ON "PaperPosition"("marketId", "side");

-- CreateIndex
CREATE INDEX "RiskEvent_createdAt_idx" ON "RiskEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModelVersion_version_key" ON "ModelVersion"("version");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "LiveFill" ADD CONSTRAINT "LiveFill_liveOrderId_fkey" FOREIGN KEY ("liveOrderId") REFERENCES "LiveOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperFill" ADD CONSTRAINT "PaperFill_paperOrderId_fkey" FOREIGN KEY ("paperOrderId") REFERENCES "PaperOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
