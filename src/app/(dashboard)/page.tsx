import { redirect } from 'next/navigation';
import { HeaderBar } from '@/components/dashboard/header-bar';
import { OpportunitiesTable } from '@/components/dashboard/opportunities-table';
import { BotControlPanel } from '@/components/dashboard/bot-control-panel';
import { RiskPanel } from '@/components/dashboard/risk-panel';
import { NavBar } from '@/components/dashboard/nav-bar';
import { getSessionFromCookies } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <HeaderBar />
      <NavBar />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OpportunitiesTable />
        </div>
        <div className="space-y-4">
          <BotControlPanel />
          <RiskPanel />
        </div>
      </section>
    </main>
  );
}
