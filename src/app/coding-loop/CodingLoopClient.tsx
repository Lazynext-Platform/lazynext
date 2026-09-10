'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch, GitPullRequest, Code, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  todo: 'default',
  in_progress: 'info',
  done: 'success',
  cancelled: 'default',
  blocked: 'warning',
  failed: 'danger',
  verified: 'success',
};

const statusLabel: Record<string, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
  blocked: 'Blocked',
  failed: 'Failed',
  verified: 'Verified',
};

export default function CodingLoopClient({ loops: initialLoops }: { loops: Array<Record<string, unknown>> }) {
  const router = useRouter();
  const [loops, setLoops] = useState<Array<Record<string, unknown>>>(initialLoops);
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [issueNumber, setIssueNumber] = useState('');
  const [agentId, setAgentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/coding-loop/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: owner.trim(),
          repo: repo.trim(),
          issueNumber: Number(issueNumber),
          agentId: agentId.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'failed_to_start');
      }
      setSuccess(`Started coding loop for issue #${issueNumber}. Branch: ${data.branchName}`);
      setOwner('');
      setRepo('');
      setIssueNumber('');
      setAgentId('');
      // Refresh the list
      const listRes = await fetch('/api/coding-loop/list');
      const listData = await listRes.json().catch(() => ({ loops: [] }));
      setLoops(listData.loops || []);
      setTimeout(() => router.refresh(), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Start form */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          <h2 className="font-semibold">Start a Coding Loop</h2>
        </div>
        <p className="text-sm text-fg-secondary mb-4">
          Enter a GitHub issue to automatically create a branch, generate code, and open a PR.
        </p>
        <form onSubmit={handleStart} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Owner</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                required
                placeholder="e.g. my-org"
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Repository</label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                required
                placeholder="e.g. my-repo"
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Issue Number</label>
              <input
                type="number"
                value={issueNumber}
                onChange={(e) => setIssueNumber(e.target.value)}
                required
                placeholder="e.g. 42"
                min="1"
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Agent ID (optional)</label>
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="auto-assign"
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          {success && <p className="text-xs text-success">{success}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Starting…
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4" /> Start Coding Loop
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Loop list */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Coding Loops</h2>
          <Badge variant="accent">{loops.length}</Badge>
        </div>
        {loops.length === 0 ? (
          <EmptyState
            icon={Code}
            title="No coding loops yet"
            description="Start a coding loop above to see it appear here."
          />
        ) : (
          <div className="space-y-3">
            {loops.map((rawLoop) => {
              const loop = rawLoop as {
                id: string;
                title: string;
                status: string;
                branchName?: string | null;
                owner?: string | null;
                repo?: string | null;
                issueNumber?: number | null;
                issueTitle?: string | null;
                prNumber?: number | null;
                prUrl?: string | null;
                createdAt: string;
              };
              return (
              <div
                key={loop.id}
                className="flex items-center justify-between border rounded-lg p-4"
                style={{ borderColor: 'var(--c-ink)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">
                      {loop.issueTitle || loop.title}
                    </span>
                    {loop.issueNumber && (
                      <a
                        href={`https://github.com/${loop.owner}/${loop.repo}/issues/${loop.issueNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-fg-secondary hover:text-fg inline-flex items-center gap-0.5"
                      >
                        #{loop.issueNumber} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-fg-secondary">
                    {loop.branchName && (
                      <span className="inline-flex items-center gap-1">
                        <GitBranch className="h-3 w-3" /> {loop.branchName}
                      </span>
                    )}
                    {loop.prNumber && (
                      <a
                        href={loop.prUrl || `https://github.com/${loop.owner}/${loop.repo}/pull/${loop.prNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent-primary hover:underline"
                      >
                        <GitPullRequest className="h-3 w-3" /> PR #{loop.prNumber}
                      </a>
                    )}
                    <span className="text-fg-secondary">
                      {new Date(loop.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {loop.status === 'done' ? (
                    <Badge variant={statusVariant[loop.status] || 'default'}>
                      <CheckCircle className="h-3 w-3 mr-1" /> {statusLabel[loop.status] || loop.status}
                    </Badge>
                  ) : loop.prNumber ? (
                    <Badge variant={statusVariant[loop.status] || 'default'}>
                      <GitPullRequest className="h-3 w-3 mr-1" /> {statusLabel[loop.status] || loop.status}
                    </Badge>
                  ) : (
                    <Badge variant={statusVariant[loop.status] || 'default'}>
                      <Code className="h-3 w-3 mr-1" /> {statusLabel[loop.status] || loop.status}
                    </Badge>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
