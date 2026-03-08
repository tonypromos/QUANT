import { NextResponse, type NextRequest } from 'next/server';
import { BotMode } from '@prisma/client';
import { z } from 'zod';
import { requireOperator } from '@/lib/guards';
import { setBotMode } from '@/lib/services/bot';
import { prisma } from '@/lib/db';
import { getOrCreateSettings } from '@/lib/repository';

const schema = z.object({
  mode: z.enum([BotMode.minutes_to_hours, BotMode.hours_to_days])
});

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

  const mode = parsed.data.mode;

  await setBotMode(
    {
      id: guard.session.id,
      role: guard.session.role
    },
    mode
  );

  await prisma.settings.update({
    where: { id: 'singleton' },
    data: { modeDefault: mode }
  }).catch(async () => {
    await getOrCreateSettings();
    await prisma.settings.update({
      where: { id: 'singleton' },
      data: { modeDefault: mode }
    });
  });

  return NextResponse.json({ ok: true, mode });
}
