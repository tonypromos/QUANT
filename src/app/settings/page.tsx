import { requireOperatorPageSession } from '@/lib/page-auth';
import { prisma } from '@/lib/db';
import { HeaderBar } from '@/components/dashboard/header-bar';
import { NavBar } from '@/components/dashboard/nav-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsForm } from '@/components/dashboard/settings-form';

export default async function SettingsPage() {
  await requireOperatorPageSession();

  const settings = await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {}
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <HeaderBar />
      <NavBar />

      <Card>
        <CardHeader>
          <CardTitle>Settings & Model Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initial={{
              emailAlertsEnabled: settings.emailAlertsEnabled,
              paperAutotradeEnabled: settings.paperAutotradeEnabled,
              modeDefault: settings.modeDefault,
              bankrollUsd: settings.bankrollUsd.toString(),
              minLiquidityUsd: settings.minLiquidityUsd.toString(),
              edgeThreshold: settings.edgeThreshold.toString(),
              minConfidence: settings.minConfidence.toString(),
              maxNewPositionsPerDay: settings.maxNewPositionsPerDay.toString(),
              maxExposurePerMarketPct: settings.maxExposurePerMarketPct.toString(),
              maxTotalExposurePct: settings.maxTotalExposurePct.toString(),
              whitelistTags: settings.whitelistTags
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
