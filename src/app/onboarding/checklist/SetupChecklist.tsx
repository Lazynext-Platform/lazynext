'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle, Circle, Database, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  required: boolean;
  category: string;
}

interface SetupChecklistData {
  items: ChecklistItem[];
  completionPercent: number;
}

interface SetupChecklistProps {
  organizationId: string;
  /** Compact mode hides the card wrapper (for embedding in dashboard). */
  compact?: boolean;
}

// Map checklist item IDs to their relevant page links
const ITEM_LINKS: Record<string, string> = {
  has_workspace: '/onboarding/wizard',
  has_agent: '/agents',
  has_goal: '/goals',
  has_plan: '/plans',
  has_task: '/tasks',
  has_customer: '/crm',
  has_billing: '/settings/billing',
  has_security: '/settings/security',
  has_team: '/settings/team',
};

export function SetupChecklist({ organizationId, compact = false }: SetupChecklistProps) {
  const [data, setData] = useState<SetupChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const fetchChecklist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/onboarding/checklist?organizationId=${organizationId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  async function handleSeedSample() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/onboarding/seed-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      if (res.ok) {
        const json = await res.json();
        const s = json.summary;
        setSeedResult(`Seeded ${s.goals} goals, ${s.plans} plans, ${s.tasks} tasks, ${s.customers} customers, ${s.deals} deals, ${s.agents} agents.`);
        await fetchChecklist();
      } else {
        setSeedResult('Failed to seed sample data.');
      }
    } catch {
      setSeedResult('Failed to seed sample data.');
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <Card className={compact ? '' : 'p-5'}>
        <div className="flex items-center gap-2 text-sm text-fg-muted p-4">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading checklist...
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={compact ? '' : 'p-5'}>
        <p className="text-sm text-fg-muted p-4">Unable to load checklist.</p>
      </Card>
    );
  }

  // Group items by category
  const categories = [...new Set(data.items.map((i) => i.category))];
  const completedCount = data.items.filter((i) => i.completed).length;

  return (
    <Card className={compact ? '' : 'p-5'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="heading-display text-sm">Setup Checklist</h2>
          <p className="text-xs text-fg-muted">
            {completedCount} of {data.items.length} complete
          </p>
        </div>
        <Badge variant={data.completionPercent === 100 ? 'success' : 'default'}>
          {data.completionPercent}%
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="h-2 border-2 mb-4" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-surface)' }}>
        <div
          className="h-full transition-all"
          style={{
            width: `${data.completionPercent}%`,
            backgroundColor: data.completionPercent === 100 ? 'var(--c-success)' : 'var(--c-accent)',
            borderRadius: 'var(--radius-sm)',
          }}
        />
      </div>

      {/* Items by category */}
      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category}>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2">{category}</p>
            <div className="space-y-1">
              {data.items.filter((i) => i.category === category).map((item) => {
                const href = ITEM_LINKS[item.id] || '#';
                return (
                  <Link
                    key={item.id}
                    href={href}
                    className="flex items-center gap-2 p-2 border-2 bg-surface hover:bg-hover transition-colors"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  >
                    {item.completed ? (
                      <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--c-success)' }} />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-fg-muted" />
                    )}
                    <span className={`text-sm flex-1 ${item.completed ? 'line-through text-fg-muted' : ''}`}>
                      {item.label}
                    </span>
                    {!item.required && <Badge variant="default">Optional</Badge>}
                    {!item.completed && <ArrowRight className="h-3 w-3 text-fg-muted" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Seed sample data button */}
      {data.completionPercent < 100 && (
        <div className="mt-4 pt-4 border-t-2" style={{ borderColor: 'var(--c-ink)' }}>
          <Button onClick={handleSeedSample} disabled={seeding} variant="secondary" size="sm" className="w-full">
            <Database className="h-4 w-4" />
            {seeding ? 'Seeding...' : 'Seed Sample Data'}
          </Button>
          {seedResult && (
            <p className="text-xs text-fg-secondary mt-2">{seedResult}</p>
          )}
        </div>
      )}
    </Card>
  );
}
