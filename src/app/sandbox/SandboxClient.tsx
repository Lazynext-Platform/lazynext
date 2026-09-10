'use client';

import { useState } from 'react';
import { Terminal, Play, Square, Code, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

type Language = 'javascript' | 'typescript' | 'python' | 'shell';
type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';

interface SandboxRun {
  id: string;
  language: string;
  code: string;
  status: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number | null;
  timeoutSec: number;
  createdAt: string;
  completedAt: string | null;
}

interface SandboxStats {
  total: number;
  byStatus: Record<string, number>;
  byLanguage: Record<string, number>;
  successRate: number;
  avgDurationMs: number;
}

interface SandboxQuota {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

interface SandboxClientProps {
  workspaces: { id: string; name: string }[];
  defaultWorkspaceId: string;
  initialRuns: SandboxRun[];
  initialStats: SandboxStats;
  initialQuota: SandboxQuota;
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'shell', label: 'Shell' },
];

const TIMEOUTS = [10, 30, 60];

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  completed: 'success',
  running: 'info',
  pending: 'default',
  failed: 'danger',
  timeout: 'warning',
  cancelled: 'default',
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  completed: CheckCircle,
  running: Play,
  pending: Clock,
  failed: XCircle,
  timeout: AlertCircle,
  cancelled: Square,
};

export function SandboxClient({
  workspaces,
  defaultWorkspaceId,
  initialRuns,
  initialStats,
  initialQuota,
}: SandboxClientProps) {
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId);
  const [language, setLanguage] = useState<Language>('javascript');
  const [code, setCode] = useState("console.log('Hello from sandbox!');");
  const [timeoutSec, setTimeoutSec] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SandboxRun | null>(null);
  const [runs, setRuns] = useState<SandboxRun[]>(initialRuns);

  async function handleExecute() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/sandbox/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, language, code, timeoutSec }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'failed_to_execute');
      }
      setResult(data.run);
      // Prepend to runs list
      setRuns((prev) => [data.run, ...prev].slice(0, 20));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(runId: string) {
    try {
      const res = await fetch(`/api/sandbox/runs/${runId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.run) {
          setRuns((prev) => prev.map((r) => (r.id === runId ? data.run : r)));
        }
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Execution Form */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Code className="h-5 w-5 text-fg-secondary" />
          <h2 className="text-sm font-semibold">Code Execution</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">Workspace</label>
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">Timeout</label>
            <select
              value={timeoutSec}
              onChange={(e) => setTimeoutSec(Number(e.target.value))}
              className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              {TIMEOUTS.map((t) => (
                <option key={t} value={t}>{t}s</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-fg-secondary mb-1">Code</label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={10}
            placeholder="Enter code to execute…"
            className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm font-mono"
            style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
          />
        </div>

        {error && <p className="text-xs text-danger mt-3">{error}</p>}

        <div className="flex justify-end mt-4">
          <Button onClick={handleExecute} disabled={loading || !code.trim()}>
            {loading ? (
              <><Play className="h-4 w-4 animate-pulse" /> Executing…</>
            ) : (
              <><Play className="h-4 w-4" /> Execute</>
            )}
          </Button>
        </div>
      </Card>

      {/* Result Display */}
      {result && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-fg-secondary" />
              <h2 className="text-sm font-semibold">Execution Result</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANTS[result.status] || 'default'} className="text-xs">
                {result.status}
              </Badge>
              {result.exitCode !== null && (
                <Badge variant={result.exitCode === 0 ? 'success' : 'danger'} className="text-xs">
                  exit: {result.exitCode}
                </Badge>
              )}
              {result.durationMs !== null && (
                <Badge variant="default" className="text-xs">
                  {result.durationMs}ms
                </Badge>
              )}
            </div>
          </div>

          {result.stdout && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-fg-secondary mb-1">stdout</label>
              <pre className="bg-bg-tertiary rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                {result.stdout}
              </pre>
            </div>
          )}

          {result.stderr && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-fg-secondary mb-1">stderr</label>
              <pre className="bg-bg-tertiary rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap text-danger">
                {result.stderr}
              </pre>
            </div>
          )}

          {!result.stdout && !result.stderr && (
            <p className="text-sm text-fg-muted">No output.</p>
          )}
        </Card>
      )}

      {/* Recent Runs */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="h-5 w-5 text-fg-secondary" />
          <h2 className="text-sm font-semibold">Recent Runs</h2>
        </div>

        {runs.length === 0 ? (
          <p className="text-sm text-fg-muted">No sandbox runs yet. Execute some code above.</p>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => {
              const StatusIcon = STATUS_ICONS[r.status] || Clock;
              return (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-4 rounded-md border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon className="h-3 w-3 text-fg-secondary shrink-0" />
                      <Badge variant="default" className="text-xs">{r.language}</Badge>
                      <Badge variant={STATUS_VARIANTS[r.status] || 'default'} className="text-xs">
                        {r.status}
                      </Badge>
                      {r.exitCode !== null && (
                        <span className="text-xs text-fg-muted">exit: {r.exitCode}</span>
                      )}
                      {r.durationMs !== null && (
                        <span className="text-xs text-fg-muted">{r.durationMs}ms</span>
                      )}
                    </div>
                    <p className="text-xs text-fg-muted font-mono truncate">
                      {r.code.slice(0, 100)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {['pending', 'running'].includes(r.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(r.id)}
                      >
                        <Square className="h-3 w-3" /> Cancel
                      </Button>
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
