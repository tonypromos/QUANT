import type { Prisma, UserRole } from '@prisma/client';
import { prisma } from '@/lib/db';

type AuditInput = {
  actorRole?: UserRole;
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  detailsJson?: Prisma.InputJsonValue;
};

export const writeAuditEvent = async (input: AuditInput): Promise<void> => {
  await prisma.auditEvent.create({
    data: {
      actorRole: input.actorRole,
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      detailsJson: input.detailsJson
    }
  });
};
