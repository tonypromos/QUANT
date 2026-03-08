import { NextResponse, type NextRequest } from 'next/server';
import { BotMode } from '@prisma/client';
import { z } from 'zod';
import { requireSession, requireOperator } from '@/lib/guards';
import { getOrCreateSettings } from '@/lib/repository';
import { prisma } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';

const schema = z.object({
  emailAlertsEnabled: z.boolean().optional(),
  paperAutotradeEnabled: z.boolean().optional(),
  riskLimitsConfigured: z.boolean().optional(),
  modeDefault: z.enum([BotMode.minutes_to_hours, BotMode.hours_to_days]).optional(),
  minLiquidityUsd: z.number().min(0).optional(),
  maxSpread: z.number().min(0).max(1).optional(),
  edgeThreshold: z.number().min(0).max(1).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  maxExposurePerMarketPct: z.number().min(0).max(1).optional(),
  maxExposurePerTagPct: z.number().min(0).max(1).optional(),
  maxTotalExposurePct: z.number().min(0).max(1).optional(),
  dailyLossStopPct: z.number().min(0).max(1).optional(),
  maxNewPositionsPerDay: z.number().int().min(1).optional(),
  orderTtlSecMin: z.number().int().min(1).optional(),
  orderTtlSecMax: z.number().int().min(1).optional(),
  bankrollUsd: z.number().positive().optional(),
  whitelistTags: z.array(z.string().min(1)).optional()
});

export async function GET(request: NextRequest) {
  const guard = await requireSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const settings = await getOrCreateSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: NextRequest) {
  const guard = await requireOperator(request);
  if (!guard.ok) {
    return guard.response;
  }

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  await getOrCreateSettings();

  const settings = await prisma.settings.update({
    where: { id: 'singleton' },
    data: parsed.data
  });

  await writeAuditEvent({
    actorId: guard.session.id,
    actorRole: guard.session.role,
    action: 'settings.updated',
    targetType: 'Settings',
    targetId: 'singleton',
    detailsJson: parsed.data
  });

  return NextResponse.json({ ok: true, settings });
}
