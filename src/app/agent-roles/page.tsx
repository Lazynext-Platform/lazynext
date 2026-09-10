'use client';

import { useEffect, useState } from 'react';
import { Users, X, ShieldCheck } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Card, Button, EmptyState } from '@/components/ui';

// ── Types (mirror src/lib/services/agent-roles.ts) ──

type AgentRiskLevel = 'low' | 'medium' | 'high';
type AgentAutonomyMode = 'manual' | 'assisted' | 'autonomous';

interface AgentRoleDefinition {
  role: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  permissions: string[];
  riskLevel: AgentRiskLevel;
  autonomyMode: AgentAutonomyMode;
  budgetCategory: string;
  maxConcurrentRuns: number;
  defaultContextTypes: string[];
}

const RISK_STYLES: Record<AgentRiskLevel, { badge: string; dot: string; label: string }> = {
  low: { badge: 'bg-green-500/15 text-green-400', dot: 'bg-green-400', label: 'Low Risk' },
  medium: { badge: 'bg-yellow-500/15 text-yellow-400', dot: 'bg-yellow-400', label: 'Medium Risk' },
  high: { badge: 'bg-red-500/15 text-red-400', dot: 'bg-red-400', label: 'High Risk' },
};

const AUTONOMY_LABELS: Record<AgentAutonomyMode, string> = {
  manual: 'Manual',
  assisted: 'Assisted',
  autonomous: 'Autonomous',
};

export default function AgentRolesPage() {
  const [roles, setRoles] = useState<AgentRoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AgentRoleDefinition | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/agent-roles', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load agent roles (${res.status})`);
        const data = await res.json();
        const list: AgentRoleDefinition[] = Array.isArray(data) ? data : data.roles ?? [];
        if (!cancelled) setRoles(list);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load agent roles');
          setRoles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Shell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-2">
          <Users className="h-6 w-6 text-accent-primary" />
          <div>
            <h1 className="heading-display text-2xl">Agent Roles</h1>
            <p className="mt-1 text-sm text-fg-secondary">
              The 12 agent role definitions — tools, permissions, risk posture, and autonomy mode.
            </p>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-red-500/30 p-4 text-sm text-red-400">{error}</Card>
        )}

        {loading ? (
          <div className="p-8 text-fg-secondary">Loading agent roles…</div>
        ) : roles.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={Users}
              title="No agent roles found"
              description="Agent role definitions could not be loaded from the API."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => {
              const risk = RISK_STYLES[role.riskLevel];
              return (
                <Card
                  key={role.role}
                  interactive
                  className="cursor-pointer p-5"
                  onClick={() => setSelected(role)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-fg">{role.name}</h2>
                      <p className="mt-0.5 font-mono text-xs text-fg-muted">{role.role}</p>
                    </div>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${risk.badge}`}>
                      {risk.label}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-3 text-xs text-fg-secondary">{role.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-fg-muted">
                      {AUTONOMY_LABELS[role.autonomyMode]}
                    </span>
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-fg-muted">
                      {role.tools.length} tools
                    </span>
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-fg-muted">
                      {role.permissions.length} perms
                    </span>
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-fg-muted">
                      max {role.maxConcurrentRuns} concurrent
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {role.tools.slice(0, 4).map((t) => (
                      <span key={t} className="rounded bg-[#00b2fc]/10 px-1.5 py-0.5 text-[10px] text-[#00b2fc]">
                        {t}
                      </span>
                    ))}
                    {role.tools.length > 4 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-fg-muted">+{role.tools.length - 4}</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-label="Agent role details"
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-line bg-popover p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-accent-primary" />
                <div>
                  <h2 className="text-lg font-semibold text-fg">{selected.name}</h2>
                  <p className="font-mono text-xs text-fg-muted">{selected.role}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1 text-fg-faint hover:bg-hover"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-fg-secondary">{selected.description}</p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-elevated p-3">
                <div className="text-[10px] uppercase text-fg-muted">Risk</div>
                <div className={`mt-1 text-sm font-medium ${RISK_STYLES[selected.riskLevel].badge.split(' ')[1]}`}>
                  {RISK_STYLES[selected.riskLevel].label}
                </div>
              </div>
              <div className="rounded-lg bg-elevated p-3">
                <div className="text-[10px] uppercase text-fg-muted">Autonomy</div>
                <div className="mt-1 text-sm font-medium text-fg">{AUTONOMY_LABELS[selected.autonomyMode]}</div>
              </div>
              <div className="rounded-lg bg-elevated p-3">
                <div className="text-[10px] uppercase text-fg-muted">Budget</div>
                <div className="mt-1 text-sm font-medium text-fg">{selected.budgetCategory}</div>
              </div>
              <div className="rounded-lg bg-elevated p-3">
                <div className="text-[10px] uppercase text-fg-muted">Concurrent</div>
                <div className="mt-1 text-sm font-medium text-fg">{selected.maxConcurrentRuns}</div>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="mb-2 text-xs font-bold text-fg">Tools</h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.tools.map((t) => (
                  <span key={t} className="rounded bg-[#00b2fc]/10 px-2 py-0.5 text-xs text-[#00b2fc]">{t}</span>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <h3 className="mb-2 text-xs font-bold text-fg">Permissions</h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.permissions.map((p) => (
                  <span key={p} className="rounded bg-elevated px-2 py-0.5 text-xs text-fg-secondary">{p}</span>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <h3 className="mb-2 text-xs font-bold text-fg">Context Types</h3>
              <div className="flex flex-wrap gap-1.5">
                {selected.defaultContextTypes.map((c) => (
                  <span key={c} className="rounded bg-elevated px-2 py-0.5 text-xs text-fg-secondary">{c}</span>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <h3 className="mb-2 text-xs font-bold text-fg">System Prompt</h3>
              <p className="rounded-lg bg-elevated p-3 text-xs leading-relaxed text-fg-secondary">
                {selected.systemPrompt}
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
