'use client';

import { useState, useCallback } from 'react';
import {
  AlertTriangle, Shield, Plus, X, Search, Clock, CheckCircle,
  TrendingUp, Activity, Target,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

// ── Types ──

type RiskCategory =
  | 'strategic' | 'operational' | 'financial' | 'compliance'
  | 'security' | 'technology' | 'reputation' | 'external';

type RiskStatus = 'identified' | 'assessed' | 'mitigating' | 'accepted' | 'closed';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface Risk {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  category: RiskCategory;
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel: RiskLevel;
  owner: string | null;
  status: RiskStatus;
  mitigationPlan: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RiskMatrix {
  matrix: number[][];
  total: number;
}

interface RiskStats {
  totalRisks: number;
  byCategory: Record<string, number>;
  byLevel: Record<RiskLevel, number>;
  byStatus: Record<string, number>;
  avgRiskScore: number;
  highCriticalCount: number;
}

type MitigationType = 'preventive' | 'corrective' | 'detective' | 'compensating';
type MitigationStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

interface RiskMitigation {
  id: string;
  organizationId: string;
  workspaceId: string;
  riskId: string;
  action: string;
  type: MitigationType;
  owner: string | null;
  dueDate: Date | null;
  status: MitigationStatus;
  cost: number | null;
  effectiveness: number | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MitigationStats {
  totalMitigations: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  overdueCount: number;
  avgEffectiveness: number;
}

interface RiskDashboardProps {
  organizationId: string;
  initialRisks: Risk[];
  initialHighRisks: Risk[];
  initialRiskMatrix: RiskMatrix;
  initialRiskStats: RiskStats;
  initialMitigations: RiskMitigation[];
  initialMitigationStats: MitigationStats;
  initialOverdueMitigations: RiskMitigation[];
}

const levelVariant: Record<RiskLevel, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'success',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

const statusVariant: Record<RiskStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  identified: 'info',
  assessed: 'accent',
  mitigating: 'warning',
  accepted: 'default',
  closed: 'success',
};

const mitigationStatusVariant: Record<MitigationStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  planned: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

const categories: RiskCategory[] = [
  'strategic', 'operational', 'financial', 'compliance',
  'security', 'technology', 'reputation', 'external',
];

const levels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
const statuses: RiskStatus[] = ['identified', 'assessed', 'mitigating', 'accepted', 'closed'];

export function RiskDashboard({
  organizationId: _organizationId,
  initialRisks,
  initialHighRisks,
  initialRiskMatrix,
  initialRiskStats,
  initialMitigations,
  initialMitigationStats,
  initialOverdueMitigations,
}: RiskDashboardProps) {
  const [risks, setRisks] = useState<Risk[]>(initialRisks);
  const [highRisks] = useState<Risk[]>(initialHighRisks);
  const [riskMatrix] = useState<RiskMatrix>(initialRiskMatrix);
  const [riskStats] = useState<RiskStats>(initialRiskStats);
  const [mitigations, setMitigations] = useState<RiskMitigation[]>(initialMitigations);
  const [mitigationStats] = useState<MitigationStats>(initialMitigationStats);
  const [overdueMitigations] = useState<RiskMitigation[]>(initialOverdueMitigations);

  const [filterCategory, setFilterCategory] = useState<RiskCategory | ''>('');
  const [filterLevel, setFilterLevel] = useState<RiskLevel | ''>('');
  const [filterStatus, setFilterStatus] = useState<RiskStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'register' | 'matrix' | 'high' | 'mitigations' | 'stats'>('register');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<RiskCategory>('operational');
  const [newLikelihood, setNewLikelihood] = useState(3);
  const [newImpact, setNewImpact] = useState(3);
  const [newOwner, setNewOwner] = useState('');
  const [creating, setCreating] = useState(false);

  const filteredRisks = risks.filter((r) => {
    if (filterCategory && r.category !== filterCategory) return false;
    if (filterLevel && r.riskLevel !== filterLevel) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.title.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleCreateRisk = useCallback(async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription,
          category: newCategory,
          likelihood: newLikelihood,
          impact: newImpact,
          owner: newOwner || undefined,
        }),
      });
      const data = await res.json();
      if (data.risk) {
        setRisks((prev) => [...prev, data.risk]);
        setShowCreateForm(false);
        setNewTitle('');
        setNewDescription('');
        setNewOwner('');
        setNewLikelihood(3);
        setNewImpact(3);
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }, [newTitle, newDescription, newCategory, newLikelihood, newImpact, newOwner]);

  async function handleStatusChange(riskId: string, status: RiskStatus) {
    try {
      const res = await fetch(`/api/risks/${riskId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.risk) {
        setRisks((prev) => prev.map((r) => (r.id === riskId ? data.risk : r)));
      }
    } catch { /* ignore */ }
  }

  async function handleMitigationStatusChange(id: string, status: MitigationStatus) {
    try {
      const res = await fetch(`/api/risks/mitigations/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.mitigation) {
        setMitigations((prev) => prev.map((m) => (m.id === id ? data.mitigation : m)));
      }
    } catch { /* ignore */ }
  }

  // Matrix cell color
  function matrixCellColor(likelihood: number, impact: number): string {
    const score = (likelihood + 1) * (impact + 1);
    if (score <= 5) return 'bg-success/20 text-success';
    if (score <= 12) return 'bg-info/20 text-info';
    if (score <= 20) return 'bg-warning/20 text-warning';
    return 'bg-danger/20 text-danger';
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
            <AlertTriangle className="h-3 w-3" /> Total Risks
          </div>
          <div className="text-xl font-bold">{riskStats.totalRisks}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
            <TrendingUp className="h-3 w-3" /> High/Critical
          </div>
          <div className="text-xl font-bold text-danger">{riskStats.highCriticalCount}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
            <Activity className="h-3 w-3" /> Avg Score
          </div>
          <div className="text-xl font-bold">{riskStats.avgRiskScore.toFixed(1)}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
            <Shield className="h-3 w-3" /> Mitigations
          </div>
          <div className="text-xl font-bold">{mitigationStats.totalMitigations}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
            <Clock className="h-3 w-3" /> Overdue
          </div>
          <div className="text-xl font-bold text-danger">{mitigationStats.overdueCount}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
            <CheckCircle className="h-3 w-3" /> Completed
          </div>
          <div className="text-xl font-bold text-success">{mitigationStats.byStatus.completed ?? 0}</div>
        </Card>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {([
            ['register', 'Risk Register'],
            ['matrix', 'Risk Matrix'],
            ['high', 'High Risks'],
            ['mitigations', 'Mitigations'],
            ['stats', 'Stats'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 text-sm rounded-lg ${activeTab === key ? 'bg-accent-primary text-white' : 'text-fg-secondary hover:bg-fg-muted/10'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreateForm((v) => !v)}>
          {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreateForm ? 'Cancel' : 'New Risk'}
        </Button>
      </div>

      {/* Create Risk Form */}
      {showCreateForm && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4 text-accent-primary" /> Create New Risk
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Risk title"
                className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as RiskCategory)}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Likelihood (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={newLikelihood}
                onChange={(e) => setNewLikelihood(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Impact (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={newImpact}
                onChange={(e) => setNewImpact(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-fg-secondary mb-1 block">Description</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Risk description..."
                rows={2}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Owner</label>
              <input
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="Risk owner"
                className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
              />
            </div>
            <div className="flex items-end">
              <div className="text-xs text-fg-secondary">
                Score: <span className="font-bold">{newLikelihood * newImpact}</span> — Level:{' '}
                <span className="font-bold">
                  {newLikelihood * newImpact <= 5 ? 'Low' : newLikelihood * newImpact <= 12 ? 'Medium' : newLikelihood * newImpact <= 20 ? 'High' : 'Critical'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleCreateRisk} disabled={creating || !newTitle.trim()}>
              {creating ? 'Creating...' : 'Create Risk'}
            </Button>
          </div>
        </Card>
      )}

      {/* Risk Register */}
      {activeTab === 'register' && (
        <Card className="p-4 space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-fg-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search risks..."
                className="w-full pl-7 pr-3 py-1.5 text-sm border rounded-lg bg-transparent"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as RiskCategory | '')}
              className="px-3 py-1.5 text-sm border rounded-lg bg-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as RiskLevel | '')}
              className="px-3 py-1.5 text-sm border rounded-lg bg-transparent"
            >
              <option value="">All Levels</option>
              {levels.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as RiskStatus | '')}
              className="px-3 py-1.5 text-sm border rounded-lg bg-transparent"
            >
              <option value="">All Statuses</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Risk List */}
          <div className="space-y-2">
            {filteredRisks.length === 0 ? (
              <div className="text-sm text-fg-secondary text-center py-8">No risks found.</div>
            ) : (
              filteredRisks.map((risk) => (
                <div key={risk.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{risk.title}</span>
                        <Badge variant={levelVariant[risk.riskLevel]} className="text-xs">{risk.riskLevel}</Badge>
                        <Badge variant={statusVariant[risk.status]} className="text-xs">{risk.status}</Badge>
                      </div>
                      {risk.description && (
                        <div className="text-xs text-fg-secondary mt-1">{risk.description}</div>
                      )}
                    </div>
                    <div className="text-right text-xs flex-shrink-0">
                      <div className="font-bold">Score: {risk.riskScore}</div>
                      <div className="text-fg-muted">L:{risk.likelihood} × I:{risk.impact}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-fg-secondary">
                    <Badge variant="default" className="text-xs">{risk.category}</Badge>
                    {risk.owner && <span>Owner: {risk.owner}</span>}
                    <select
                      value={risk.status}
                      onChange={(e) => handleStatusChange(risk.id, e.target.value as RiskStatus)}
                      className="px-2 py-0.5 text-xs border rounded bg-transparent"
                    >
                      {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Risk Matrix */}
      {activeTab === 'matrix' && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-accent-primary" /> Risk Matrix (Likelihood × Impact)
          </h3>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="p-1 text-fg-secondary">L \ I</th>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <th key={i} className="p-1 text-center text-fg-secondary">{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[5, 4, 3, 2, 1].map((l) => (
                  <tr key={l}>
                    <td className="p-1 text-center font-bold text-fg-secondary">{l}</td>
                    {[1, 2, 3, 4, 5].map((i) => {
                      const count = riskMatrix.matrix[l - 1]?.[i - 1] ?? 0;
                      return (
                        <td key={i} className={`p-2 text-center border rounded ${matrixCellColor(l - 1, i - 1)}`}>
                          <span className="font-bold">{count}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-fg-secondary">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/20" /> Low (1-5)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-info/20" /> Medium (6-12)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/20" /> High (13-20)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-danger/20" /> Critical (21-25)</span>
          </div>
        </Card>
      )}

      {/* High Risks */}
      {activeTab === 'high' && (
        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-danger" /> High &amp; Critical Risks
            <Badge variant="danger" className="text-xs">{highRisks.length}</Badge>
          </h3>
          {highRisks.length === 0 ? (
            <div className="text-sm text-fg-secondary text-center py-8">No high or critical risks.</div>
          ) : (
            highRisks.map((risk) => (
              <div key={risk.id} className="p-3 border border-danger/20 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{risk.title}</span>
                  <Badge variant={levelVariant[risk.riskLevel]} className="text-xs">{risk.riskLevel} ({risk.riskScore})</Badge>
                </div>
                {risk.description && <div className="text-xs text-fg-secondary">{risk.description}</div>}
                <div className="flex items-center gap-2 text-xs text-fg-secondary">
                  <Badge variant="default" className="text-xs">{risk.category}</Badge>
                  <Badge variant={statusVariant[risk.status]} className="text-xs">{risk.status}</Badge>
                  {risk.owner && <span>Owner: {risk.owner}</span>}
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {/* Mitigations */}
      {activeTab === 'mitigations' && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent-primary" /> Mitigation Actions
            </h3>
            <div className="flex gap-2 text-xs">
              <Badge variant="warning" className="text-xs">Overdue: {overdueMitigations.length}</Badge>
            </div>
          </div>
          <div className="space-y-2">
            {mitigations.length === 0 ? (
              <div className="text-sm text-fg-secondary text-center py-8">No mitigation actions yet.</div>
            ) : (
              mitigations.map((m) => (
                <div key={m.id} className="p-3 border rounded-lg space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{m.action}</div>
                      <div className="text-xs text-fg-muted mt-0.5">Risk: {m.riskId.slice(0, 12)}</div>
                    </div>
                    <Badge variant={mitigationStatusVariant[m.status]} className="text-xs">{m.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-fg-secondary">
                    <Badge variant="default" className="text-xs">{m.type}</Badge>
                    {m.owner && <span>Owner: {m.owner}</span>}
                    {m.dueDate && (
                      <span className={overdueMitigations.some((o) => o.id === m.id) ? 'text-danger' : ''}>
                        Due: {new Date(m.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {m.effectiveness !== null && <span>Effectiveness: {m.effectiveness}/5</span>}
                    <select
                      value={m.status}
                      onChange={(e) => handleMitigationStatusChange(m.id, e.target.value as MitigationStatus)}
                      className="px-2 py-0.5 text-xs border rounded bg-transparent"
                    >
                      <option value="planned">planned</option>
                      <option value="in_progress">in_progress</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Stats */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Risk Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatBox label="Total Risks" value={riskStats.totalRisks} />
              <StatBox label="High/Critical" value={riskStats.highCriticalCount} />
              <StatBox label="Avg Score" value={Number(riskStats.avgRiskScore.toFixed(1))} />
              <StatBox label="Low" value={riskStats.byLevel.low ?? 0} />
              <StatBox label="Medium" value={riskStats.byLevel.medium ?? 0} />
              <StatBox label="High" value={riskStats.byLevel.high ?? 0} />
              <StatBox label="Critical" value={riskStats.byLevel.critical ?? 0} />
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">By Category</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map((c) => (
                <StatBox key={c} label={c} value={riskStats.byCategory[c] ?? 0} />
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">By Status</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {statuses.map((s) => (
                <StatBox key={s} label={s} value={riskStats.byStatus[s] ?? 0} />
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Mitigation Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatBox label="Total" value={mitigationStats.totalMitigations} />
              <StatBox label="Overdue" value={mitigationStats.overdueCount} />
              <StatBox label="Completed" value={mitigationStats.byStatus.completed ?? 0} />
              <StatBox label="Avg Effectiveness" value={Number(mitigationStats.avgEffectiveness.toFixed(1))} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-2">
      <div className="text-xs text-fg-secondary">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
