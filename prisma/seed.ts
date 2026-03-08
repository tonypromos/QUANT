import { PrismaClient, BotMode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      modeDefault: BotMode.hours_to_days,
      riskLimitsConfigured: true,
      paperAutotradeEnabled: true,
      emailAlertsEnabled: true,
      bankrollUsd: 300
    },
    update: {}
  });

  await prisma.botState.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      mode: BotMode.hours_to_days,
      liveEnabled: false,
      killSwitchActive: false
    },
    update: {}
  });

  await prisma.modelVersion.upsert({
    where: { version: 'v1-market-only' },
    create: {
      version: 'v1-market-only',
      trainedOnFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      trainedOnTo: new Date(),
      calibrationEce: 0.04,
      brierScore: 0.19,
      metadataJson: { source: 'seed' }
    },
    update: {}
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
