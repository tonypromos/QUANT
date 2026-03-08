import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireOperator } from '@/lib/guards';
import { prisma } from '@/lib/db';
import { getOrCreateSettings } from '@/lib/repository';
import { writeAuditEvent } from '@/lib/audit';

const schema = z.object({
  enabled: z.boolean()
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

  await getOrCreateSettings();
  const settings = await prisma.settings.update({
    where: { id: 'singleton' },
    data: { emailAlertsEnabled: parsed.data.enabled }
  });

  await writeAuditEvent({
    actorId: guard.session.id,
    actorRole: guard.session.role,
    action: 'alerts.email_toggle',
    targetType: 'Settings',
    targetId: 'singleton',
    detailsJson: { enabled: parsed.data.enabled }
  });

  return NextResponse.json({ ok: true, emailAlertsEnabled: settings.emailAlertsEnabled });
}
