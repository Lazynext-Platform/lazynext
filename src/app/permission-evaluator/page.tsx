'use client';

import { useState } from 'react';
import { ShieldCheck, Play, History } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Card, Button, Input, EmptyState } from '@/components/ui';

// ── Types (mirror src/lib/services/permission-evaluator.ts) ──

type PermissionDecision = 'allow' | 'deny' | 'require_approval' | 'allow_with_limit';

interface LayerResult {
  layer: string;
  result: PermissionDecision;
  reason: string;
}

interface PermissionEvaluationResult {
  decision: PermissionDecision;
  reason: string;
  layers: LayerResult[];
  evaluatedAt: string;
}

const DECISION_STYLES: Record<PermissionDecision, { badge: string; label: string }> = {
  allow: { badge: 'bg-green-500/15 text-green-400', label: 'Allow' },
  deny: { badge: 'bg-red-500/15 text-red-400', label: 'Deny' },
  require_approval: { badge: 'bg-yellow-500/15 text-yellow-400', label: 'Require Approval' },
  allow_with_limit: { badge: 'bg-blue-500/15 text-blue-400', label: 'Allow with Limit' },
};

const LAYER_ORDER = [
  'company_policy',
  'workspace_policy',
  'role_policy',
  'tool_policy',
  'resource_policy',
  'environment_policy',
  'budget_policy',
  'risk_policy',
];

interface HistoryEntry {
  id: string;
  principalId: string;
  resource: string;
  action: string;
  result: PermissionEvaluationResult;
  at: string;
}

export default function PermissionEvaluatorPage() {
  const [principalId, setPrincipalId] = useState('');
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [environment, setEnvironment] = useState<'local' | 'staging' | 'production'>('production');
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [budgetImpact, setBudgetImpact] = useState('');
  const [resourceType, setResourceType] = useState('tool');
  const [principalType, setPrincipalType] = useState<'user' | 'agent' | 'role' | 'team'>('agent');

  const [result, setResult] = useState<PermissionEvaluationResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const checkPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalId || !resource || !action) return;
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/permission-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalId,
          principalType,
          resource,
          resourceType,
          action,
          environment,
          riskLevel,
          budgetImpact: budgetImpact ? Number(budgetImpact) : undefined,
        }),
      });
      if (!res.ok) throw new Error(`Permission check failed (${res.status})`);
      const data = await res.json();
      const evalResult: PermissionEvaluationResult = data.result ?? data;
      setResult(evalResult);
      setHistory((h) =>
        [
          {
            id: `${Date.now()}`,
            principalId,
            resource,
            action,
            result: evalResult,
            at: evalResult.evaluatedAt ?? new Date().toISOString(),
          },
          ...h,
        ].slice(0, 10),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Permission check failed');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-accent-primary" />
          <div>
            <h1 className="heading-display text-2xl">Permission Evaluator</h1>
            <p className="mt-1 text-sm text-fg-secondary">
              Test permission checks against the 8-layer policy stack.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Form */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-fg">Check Permission</h2>
            <form onSubmit={checkPermission} className="space-y-4">
              <Input label="Principal ID" name="principalId" value={principalId} onChange={(e) => setPrincipalId(e.target.value)} required placeholder="agent-xxx / user-xxx" />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="label-mono" htmlFor="principalType">Principal Type</label>
                  <select id="principalType" value={principalType} onChange={(e) => setPrincipalType(e.target.value as typeof principalType)} className="input">
                    <option value="user">user</option>
                    <option value="agent">agent</option>
                    <option value="role">role</option>
                    <option value="team">team</option>
                  </select>
                </div>
                <Input label="Resource Type" name="resourceType" value={resourceType} onChange={(e) => setResourceType(e.target.value)} placeholder="tool / deployment / billing" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Resource" name="resource" value={resource} onChange={(e) => setResource(e.target.value)} required placeholder="tool.github" />
                <Input label="Action" name="action" value={action} onChange={(e) => setAction(e.target.value)} required placeholder="read / deploy / delete" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="label-mono" htmlFor="environment">Environment</label>
                  <select id="environment" value={environment} onChange={(e) => setEnvironment(e.target.value as typeof environment)} className="input">
                    <option value="local">local</option>
                    <option value="staging">staging</option>
                    <option value="production">production</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="label-mono" htmlFor="riskLevel">Risk Level</label>
                  <select id="riskLevel" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as typeof riskLevel)} className="input">
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </div>
              </div>
              <Input label="Budget Impact (credits, optional)" name="budgetImpact" type="number" value={budgetImpact} onChange={(e) => setBudgetImpact(e.target.value)} placeholder="e.g. 50" />

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button type="submit" size="sm" disabled={checking}>
                <Play className="mr-1.5 h-4 w-4" />
                {checking ? 'Checking…' : 'Check Permission'}
              </Button>
            </form>
          </Card>

          {/* Result */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-fg">Evaluation Result</h2>
            {!result ? (
              <EmptyState
                icon={ShieldCheck}
                title="No result yet"
                description="Submit a permission check to see the 8-layer evaluation."
              />
            ) : (
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-3 py-1 text-sm font-semibold ${DECISION_STYLES[result.decision].badge}`}>
                    {DECISION_STYLES[result.decision].label}
                  </span>
                  <span className="text-xs text-fg-muted">
                    {new Date(result.evaluatedAt).toLocaleString()}
                  </span>
                </div>
                <p className="mb-4 text-sm text-fg-secondary">{result.reason}</p>

                <h3 className="mb-2 text-xs font-bold text-fg">8-Layer Stack</h3>
                <div className="space-y-1.5">
                  {LAYER_ORDER.map((layerName) => {
                    const layer = result.layers.find((l) => l.layer === layerName);
                    if (!layer) return null;
                    return (
                      <div key={layerName} className="flex items-start gap-2 rounded-lg bg-elevated p-2.5">
                        <span className="mt-0.5 shrink-0 font-mono text-[10px] text-fg-muted">
                          {LAYER_ORDER.indexOf(layerName) + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-fg">{layer.layer}</span>
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${DECISION_STYLES[layer.result].badge}`}>
                              {DECISION_STYLES[layer.result].label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-fg-secondary">{layer.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* History */}
        <Card className="mt-6 p-6">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-fg-muted" />
            <h2 className="text-base font-semibold text-fg">Recent Checks</h2>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-fg-muted">No permission checks yet in this session.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-fg-muted">
                    <th className="py-2 pr-4 font-medium">Principal</th>
                    <th className="py-2 pr-4 font-medium">Resource</th>
                    <th className="py-2 pr-4 font-medium">Action</th>
                    <th className="py-2 pr-4 font-medium">Decision</th>
                    <th className="py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-line/50">
                      <td className="py-2 pr-4 font-mono text-xs text-fg">{h.principalId}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-fg">{h.resource}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-fg">{h.action}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${DECISION_STYLES[h.result.decision].badge}`}>
                          {DECISION_STYLES[h.result.decision].label}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-fg-muted">{new Date(h.at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
}
