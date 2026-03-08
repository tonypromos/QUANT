import Link from 'next/link';
import { LogoutButton } from '@/components/auth/logout-button';

export function NavBar() {
  return (
    <nav className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm">
      <div className="flex items-center gap-4">
        <Link className="text-white/80 hover:text-white" href="/">
          Opportunities
        </Link>
        <Link className="text-white/80 hover:text-white" href="/portfolio">
          Portfolio
        </Link>
        <Link className="text-white/80 hover:text-white" href="/trades">
          Trades
        </Link>
        <Link className="text-white/80 hover:text-white" href="/settings">
          Settings
        </Link>
      </div>
      <LogoutButton />
    </nav>
  );
}
