'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch as Github, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui';

export default function ConnectForm() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/github/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'failed_to_connect');
      }
      setSuccess(`Connected as @${data.username}`);
      setToken('');
      setTimeout(() => {
        router.refresh();
      }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center gap-2">
        <Github className="h-5 w-5" />
        <h2 className="font-semibold">Connect GitHub</h2>
      </div>
      <p className="text-sm text-fg-secondary mb-4">
        Create a personal access token with <code className="text-xs">repo</code> scope, then paste it below.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-fg-secondary mb-1">Personal Access Token</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            placeholder="ghp_…"
            autoComplete="off"
            className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm font-mono"
            style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
          />
        </div>
        <a
          href="https://github.com/settings/tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-fg-secondary hover:text-fg"
        >
          Create a token on GitHub <ExternalLink className="h-3 w-3" />
        </a>
        {error && <p className="text-xs text-danger">{error}</p>}
        {success && <p className="text-xs text-success">{success}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            <Github className="h-4 w-4" /> {loading ? 'Connecting…' : 'Connect'}
          </Button>
        </div>
      </form>
    </div>
  );
}
