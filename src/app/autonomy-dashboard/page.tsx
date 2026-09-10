'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Play, Pause, Square, Plus, Activity } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Card, Button, Input, EmptyState } from '@/components/ui';

// ── Types (mirror src/lib/services/autonomy-loop.ts) ──

type AutonomyState =
  | 'idle'
  | 'observing'
  | 'understanding'
  | 'prioritizing'
  | 'planning'
  | 'executing'
  | 'measuring'
  | 'learning'
  | 'continuing'
  | 'paused'
  | 'stopped'
  | 'failed';

type AutonomyMode = 'manual' | 'assisted' | 'autonomous' | 'timed_continuous';

interface AutonomyLoopState {
  agentId: string;
  currentState: AutonomyState;
  mode: AutonomyMode;
  iteration: number;
  lastStateChange: string;
  paused: boolean;
  stopped: boolean;
  error?: string;
}

const STATE_COLORS: Record<AutonomyState, string> = {
  idle: 'bg-fg-muted/20 text-fg-muted',
  observing: 'bg-[#00b2fc]/15 text-[#00b2fc]',
  understanding: 'bg-[#00b2fc]/15 text-[#00b2fc]',
  prioritizing: 'bg-[#00b2fc]/15 text-[#00b2fc]',
  planning: 'bg-amber-500/15 text-amber-400',
  executing: 'bg-amber-500/15 text-amber-400',
  measuring: 'bg-amber-500/15 text-amber-400',
  learning: 'bg-amber-500/15 text-amber-400',
  continuing: 'bg-[#00b2fc]/15 text-[#00b2fc]',
  paused: 'bg-yellow-500/15 text-yellow-400',
  stopped: 'bg-fg-muted/20 text-fg-muted',
  failed: 'bg-red-500/15 text-red-400',
};

const MODE_LABELS: Record<AutonomyMode, string> = {
  manual: 'Manual',
  assisted: 'Assisted',
  autonomous: 'Autonomous',
  timed_continuous: 'Timed Continuous',
};

const STATE_FLOW: AutonomyState[] = [
  'observing',
  'understanding',
  'prioritizing',
  'planning',
  'executing',
  'measuring',
  'learning',
  'continuing',
];

export default function AutonomyDashboardPage() {
  const [loops, setLoops] = useState<AutonomyLoopState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  // Create-loop form state
  const [agentId, setAgentId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [mode, setMode] = useState<AutonomyMode>('autonomous');
  const [maxIterations, setMaxIterations] = useState('');
  const [intervalMs, setIntervalMs] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchLoops = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/autonomy-loops', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load loops (${res.status})`);
      const data = await res.json();
      setLoops(Array.isArray(data) ? data : data.loops ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load autonomy loops');
      setLoops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoops();
  }, [fetchLoops]);

  const controlLoop = async (id: string, action: 'pause' | 'resume' | 'stop') => {
    setActing(id);
    try {
      await fetch(`/api/autonomy-loops/${id}/${action}`, { method: 'POST' });
      await fetchLoops();
    } catch {
      // best-effort
    } finally {
      setActing(null);
    }
  };

  const createLoop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId || !workspaceId || !organizationId) return;
    setCreating(true);
    try {
      await fetch('/api/autonomy-loops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          workspaceId,
          organizationId,
          mode,
          maxIterations: maxIterations ? Number(maxIterations) : undefined,
          intervalMs: intervalMs ? Number(intervalMs) : undefined,
          pauseOnApprovalRequired: true,
          pauseOnBudgetExceeded: true,
        }),
      });
      setShowCreate(false);
      setAgentId('');
      setMaxIterations('');
      setIntervalMs('');
      await fetchLoops();
    } catch {
      // best-effort
    } finally {
      setCreating(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-accent-primary" />
            <div>
              <h1 className="heading-display text-2xl">Autonomy Loop Dashboard</h1>
              <p className="mt-1 text-sm text-fg-secondary">
                Monitor and control autonomous agent loops across your workspace.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchLoops} disabled={loading}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Loop
            </Button>
          </div>
        </div>

        {showCreate && (
          <Card className="mb-6 p-6">
            <h2 className="mb-4 text-base font-semibold text-fg">Create New Autonomy Loop</h2>
            <form onSubmit={createLoop} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Agent ID" name="agentId" value={agentId} onChange={(e) => setAgentId(e.target.value)} required placeholder="agent-xxx" />
              <Input label="Workspace ID" name="workspaceId" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} required placeholder="ws-xxx" />
              <Input label="Organization ID" name="organizationId" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} required placeholder="org-xxx" />
              <div className="flex flex-col gap-1.5">
                <label className="label-mono" htmlFor="mode">Mode</label>
                <select
                  id="mode"
                  name="mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as AutonomyMode)}
                  className="input"
                >
                  <option value="manual">Manual</option>
                  <option value="assisted">Assisted</option>
                  <option value="autonomous">Autonomous</option>
                  <option value="timed_continuous">Timed Continuous</option>
                </select>
              </div>
              <Input label="Max Iterations (optional)" name="maxIterations" type="number" value={maxIterations} onChange={(e) => setMaxIterations(e.target.value)} placeholder="e.g. 100" />
              <Input label="Interval ms (optional)" name="intervalMs" type="number" value={intervalMs} onChange={(e) => setIntervalMs(e.target.value)} placeholder="e.g. 60000" />
              <div className="col-span-full flex items-center gap-2">
                <Button type="submit" size="sm" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Loop'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {error && (
          <Card className="mb-6 border-red-500/30 p-4 text-sm text-red-400">
            {error}
          </Card>
        )}

        {loading ? (
          <div className="p-8 text-fg-secondary">Loading autonomy loops…</div>
        ) : loops.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={Activity}
              title="No active loops"
              description="Create an autonomy loop to start an autonomous agent cycle."
              action={<Button size="sm" onClick={() => setShowCreate(true)}>Create Loop</Button>}
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {loops.map((loop) => (
              <Card key={loop.agentId} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm text-fg">{loop.agentId}</span>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATE_COLORS[loop.currentState]}`}>
                        {loop.currentState}
                      </span>
                      <span className="rounded-md bg-elevated px-2 py-0.5 text-xs text-fg-muted">
                        {MODE_LABELS[loop.mode]}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-fg-secondary">
                      <span>Iteration: <span className="font-mono text-fg">{loop.iteration}</span></span>
                      <span>Last change: <span className="font-mono text-fg">{new Date(loop.lastStateChange).toLocaleString()}</span></span>
                      {loop.error && <span className="text-red-400">Error: {loop.error}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {loop.paused ? (
                      <Button size="sm" variant="secondary" onClick={() => controlLoop(loop.agentId, 'resume')} disabled={acting === loop.agentId}>
                        <Play className="mr-1.5 h-4 w-4" /> Resume
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => controlLoop(loop.agentId, 'pause')} disabled={acting === loop.agentId || loop.stopped}>
                        <Pause className="mr-1.5 h-4 w-4" /> Pause
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => controlLoop(loop.agentId, 'stop')} disabled={acting === loop.agentId || loop.stopped}>
                      <Square className="mr-1.5 h-4 w-4" /> Stop
                    </Button>
                  </div>
                </div>

                {/* State timeline */}
                <div className="mt-4">
                  <div className="mb-1.5 text-xs font-medium text-fg-muted">Loop Timeline</div>
                  <div className="flex flex-wrap items-center gap-1">
                    {STATE_FLOW.map((s, i) => {
                      const active = loop.currentState === s;
                      const passed = STATE_FLOW.indexOf(loop.currentState as AutonomyState) > i;
                      return (
                        <div key={s} className="flex items-center gap-1">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] ${
                              active ? 'bg-[#00b2fc] text-black' : passed ? 'bg-[#00b2fc]/20 text-[#00b2fc]' : 'bg-elevated text-fg-muted'
                            }`}
                          >
                            {s}
                          </span>
                          {i < STATE_FLOW.length - 1 && <span className="text-fg-muted">→</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
