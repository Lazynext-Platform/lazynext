'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, Trash2, Loader2 } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

interface AutomationRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
}

interface AutomationDetailProps {
  automationId: string;
  name: string;
  trigger: string;
  enabled: boolean;
  definition: string;
  runs: AutomationRun[];
  totalRuns: number;
}

const runVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'default',
  running: 'info',
  completed: 'success',
  failed: 'danger',
};

/**
 * Client component for the automation detail page.
 * Handles enable/disable toggle and delete with optimistic UI.
 */
export function AutomationDetail({
  automationId,
  name,
  trigger,
  enabled: initialEnabled,
  definition,
  runs,
  totalRuns,
}: AutomationDetailProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setToggling(true);
    setError(null);
    try {
      const res = await fetch(`/api/automations/${automationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setEnabled(!enabled);
      router.refresh();
    } catch {
      setError('Failed to toggle automation');
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/automations/${automationId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/automations');
      router.refresh();
    } catch {
      setError('Failed to delete automation');
      setDeleting(false);
    }
  }

  let parsedDefinition: unknown = definition;
  try {
    parsedDefinition = JSON.parse(definition);
  } catch {
    // keep raw string
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Definition */}
        <Card className="p-5">
          <h2 className="heading-display text-sm mb-3">Definition</h2>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all p-3 border-2 bg-surface overflow-x-auto" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
            {typeof parsedDefinition === 'string'
              ? parsedDefinition
              : JSON.stringify(parsedDefinition, null, 2)}
          </pre>
        </Card>

        {/* Run history */}
        <Card className="p-5">
          <h2 className="heading-display text-sm mb-3">Run History ({totalRuns})</h2>
          {runs.length === 0 ? (
            <p className="text-sm text-fg-muted">No runs yet. Runs appear here when the trigger fires.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-2 border-2 bg-surface text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  <span className="text-xs text-fg-secondary">{new Date(run.startedAt).toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    {run.completedAt && (
                      <span className="text-xs text-fg-muted">
                        {new Date(run.completedAt).toLocaleTimeString()}
                      </span>
                    )}
                    <Badge variant={runVariant[run.status] || 'default'}>{run.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="heading-display text-sm mb-3">Details</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-fg-secondary block mb-1">Status</span>
              <Badge variant={enabled ? 'success' : 'default'}>{enabled ? 'ON' : 'OFF'}</Badge>
            </div>
            <div>
              <span className="text-xs text-fg-secondary block mb-1">Trigger</span>
              <span className="text-sm font-mono">{trigger}</span>
            </div>
            <div>
              <span className="text-xs text-fg-secondary block mb-1">Total runs</span>
              <span className="text-sm">{totalRuns}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="heading-display text-sm mb-3">Actions</h2>
          <div className="flex flex-col gap-2">
            <Button onClick={handleToggle} disabled={toggling} variant={enabled ? 'ghost' : 'primary'}>
              {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {enabled ? 'Disable' : 'Enable'}
            </Button>
            <Button onClick={handleDelete} disabled={deleting} variant="ghost">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
