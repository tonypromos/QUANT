import { Badge } from '@/components/ui/badge';

export function HeaderBar() {
  return (
    <header className="animate-fade-slide mb-6 flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-5 py-4 backdrop-blur-sm">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">NZ Operator Console</p>
        <h1 className="text-xl font-semibold">Polymarket Autonomous Trading</h1>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone="default">Roles Enforced</Badge>
        <Badge tone="success">Compliance Gate</Badge>
      </div>
    </header>
  );
}
