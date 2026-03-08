'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Login failed');
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="panel-glass mx-auto w-full max-w-sm rounded-xl p-6 shadow-glow">
      <h1 className="mb-1 text-xl font-semibold">Operator Login</h1>
      <p className="mb-6 text-sm text-white/65">Use NZ operator or analyst credentials.</p>

      <label className="mb-3 block text-sm">
        Username
        <input
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 outline-none ring-accent/40 focus:ring"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
      </label>

      <label className="mb-5 block text-sm">
        Password
        <input
          type="password"
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 outline-none ring-accent/40 focus:ring"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

      <Button className="w-full" disabled={loading} type="submit">
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
