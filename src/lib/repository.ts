import { BotMode } from '@prisma/client';
import { prisma } from '@/lib/db';

export const getOrCreateSettings = async () => {
  const found = await prisma.settings.findUnique({ where: { id: 'singleton' } });
  if (found) {
    return found;
  }
  return prisma.settings.create({
    data: {
      id: 'singleton',
      modeDefault: BotMode.hours_to_days
    }
  });
};

export const getOrCreateBotState = async () => {
  const found = await prisma.botState.findUnique({ where: { id: 'singleton' } });
  if (found) {
    return found;
  }
  return prisma.botState.create({
    data: {
      id: 'singleton',
      mode: BotMode.hours_to_days,
      liveEnabled: false,
      killSwitchActive: false
    }
  });
};
