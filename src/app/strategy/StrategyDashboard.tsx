'use client';

import { useState } from 'react';
import {
  Target, Flag, TrendingUp, Plus, X, CheckCircle2,
  Milestone as MilestoneIcon, AlignLeft, Rocket,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

interface Initiative {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string | Date;
  endDate: string | Date | null;
  owner: string | null;
  budget: number;
  progress: number;
  tags: string;
}
interface Milestone {
  id: string;
  initiativeId: string | null;
  name: string;
  description: string;
  targetDate: string | Date;
  achievedDate: string | Date | null;
  status: string;
  progress: number;
  owner: string | null;
}
interface Kpi {
  id: string;
  name: string;
  description: string | null;
  target: number;
  current: number;
  unit: string;
  direction: string;
}
interface OkR {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | Date | null;
  kpis: Kpi[];
}
interface Stats {
  totalInitiatives: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  totalMilestones: number;
  achievedMilestones: number;
  avgProgress: number;
}
interface Roadmap {
  initiatives: Initiative[];
  milestones: Milestone[];
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  planning: 'info',
  active: 'success',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'danger',
  planned: 'info',
  in_progress: 'warning',
  achieved: 'success',
  missed: 'danger',
  active_okr: 'success',
  completed_okr: 'success',
  paused: 'warning',
  cancelled_okr: 'danger',
};

const priorityVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
  urgent: 'danger',
};

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ProgressBadge({ progress }: { progress: number }) {
  const variant = progress >= 75 ? 'success' : progress >= 50 ? 'warning' : progress >= 25 ? 'info' : 'default';
  return <Badge variant={variant as 'success' | 'warning' | 'info' | 'default'} className="text-xs">{progress}%</Badge>;
}

export function StrategyDashboard({
  organizationId,
  initiatives: initialInitiatives,
  milestones: initialMilestones,
  okrs: initialOkrs,
  stats,
  roadmap,
}: {
  organizationId: string;
  initiatives: Initiative[];
  milestones: Milestone[];
  okrs: OkR[];
  stats: Stats;
  roadmap: Roadmap;
}) {
  const [initiatives] = useState(initialInitiatives);
  const [milestones] = useState(initialMilestones);
  const [okrs] = useState(initialOkrs);
  const [showCreate, setShowCreate] = useState<'initiative' | 'okr' | 'milestone' | null>(null);
  void organizationId;
  void roadmap;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Rocket className="h-3 w-3" /> Initiatives
          </div>
          <div className="text-2xl font-semibold">{stats.totalInitiatives}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <TrendingUp className="h-3 w-3" /> Avg Progress
          </div>
          <div className="text-2xl font-semibold">{stats.avgProgress}%</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Flag className="h-3 w-3" /> Milestones
          </div>
          <div className="text-2xl font-semibold">{stats.totalMilestones}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <CheckCircle2 className="h-3 w-3" /> Achieved
          </div>
          <div className="text-2xl font-semibold">{stats.achievedMilestones}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Target className="h-3 w-3" /> Active
          </div>
          <div className="text-2xl font-semibold">{stats.byStatus.active || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <MilestoneIcon className="h-3 w-3" /> Planning
          </div>
          <div className="text-2xl font-semibold">{stats.byStatus.planning || 0}</div>
        </Card>
      </div>

      {/* OKR Dashboard */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-accent-primary" /> OKRs
          </h2>
          <Button size="sm" onClick={() => setShowCreate('okr')}>
            <Plus className="h-4 w-4" /> New OKR
          </Button>
        </div>
        {okrs.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Target} title="No OKRs yet" description="Create your first objective with key results." />
          </Card>
        ) : (
          <div className="space-y-3">
            {okrs.map((okr) => (
              <Card key={okr.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-sm font-semibold">{okr.title}</span>
                    {okr.description && (
                      <p className="text-xs text-fg-secondary mt-1">{okr.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={priorityVariant[okr.priority] || 'default'} className="text-xs">{okr.priority}</Badge>
                    <Badge variant={statusVariant[okr.status] || 'default'} className="text-xs">{okr.status}</Badge>
                    <ProgressBadge progress={Math.round(okr.progress * 100)} />
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mb-3">
                  <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                    <div
                      className="h-full bg-accent-primary transition-all"
                      style={{ width: `${Math.round(okr.progress * 100)}%` }}
                    />
                  </div>
                </div>
                {/* Key Results */}
                {okr.kpis.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-fg-secondary font-medium">Key Results</div>
                    {okr.kpis.map((kpi) => {
                      const pct = kpi.target === 0 ? 0 : Math.round((kpi.current / kpi.target) * 100);
                      return (
                        <div key={kpi.id} className="flex items-center gap-2">
                          <span className="text-xs flex-1 truncate">{kpi.name}</span>
                          <div className="w-24 h-1.5 rounded-full bg-surface-alt overflow-hidden">
                            <div className="h-full bg-accent-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <span className="text-xs text-fg-muted w-16 text-right">
                            {kpi.current}/{kpi.target} {kpi.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Strategic Initiatives */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <Rocket className="h-5 w-5 text-accent-primary" /> Strategic Initiatives
          </h2>
          <Button size="sm" onClick={() => setShowCreate('initiative')}>
            <Plus className="h-4 w-4" /> New Initiative
          </Button>
        </div>
        {initiatives.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Rocket} title="No initiatives yet" description="Create a strategic initiative to track progress." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {initiatives.map((init) => (
              <Card key={init.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-semibold block truncate pr-2">{init.name}</span>
                  <ProgressBadge progress={init.progress} />
                </div>
                {init.description && (
                  <p className="text-xs text-fg-secondary mb-2 line-clamp-2">{init.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant={statusVariant[init.status] || 'default'} className="text-xs">{init.status}</Badge>
                  <Badge variant={priorityVariant[init.priority] || 'default'} className="text-xs">{init.priority}</Badge>
                  {init.owner && <span className="text-xs text-fg-muted">{init.owner}</span>}
                </div>
                <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                  <div className="h-full bg-accent-primary transition-all" style={{ width: `${init.progress}%` }} />
                </div>
                <div className="text-xs text-fg-muted mt-2">
                  {formatDate(init.startDate)} — {init.endDate ? formatDate(init.endDate) : 'Ongoing'}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Milestone Timeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <MilestoneIcon className="h-5 w-5 text-accent-primary" /> Milestone Timeline
          </h2>
          <Button size="sm" onClick={() => setShowCreate('milestone')}>
            <Plus className="h-4 w-4" /> New Milestone
          </Button>
        </div>
        {milestones.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={MilestoneIcon} title="No milestones yet" description="Add milestones to track key dates." />
          </Card>
        ) : (
          <div className="space-y-2">
            {milestones.map((ms) => (
              <Card key={ms.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-3 w-3 rounded-full shrink-0 ${ms.status === 'achieved' ? 'bg-green-500' : ms.status === 'missed' ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <span className="text-sm font-semibold truncate">{ms.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-fg-secondary">{formatDate(ms.targetDate)}</span>
                    <Badge variant={statusVariant[ms.status] || 'default'} className="text-xs">{ms.status}</Badge>
                  </div>
                </div>
                {ms.description && (
                  <p className="text-xs text-fg-secondary mt-1 ml-6">{ms.description}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Alignment Matrix */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <AlignLeft className="h-5 w-5 text-accent-primary" /> Alignment Matrix
        </h2>
        <Card className="p-4">
          {initiatives.length === 0 ? (
            <EmptyState icon={AlignLeft} title="No alignment data" description="Create initiatives and OKRs to see alignment." />
          ) : (
            <div className="space-y-2">
              {initiatives.map((init) => {
                const initMilestones = milestones.filter((m) => m.initiativeId === init.id);
                return (
                  <div key={init.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{init.name}</span>
                      {initMilestones.length > 0 && (
                        <span className="text-xs text-fg-muted ml-2">{initMilestones.length} milestone{initMilestones.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusVariant[init.status] || 'default'} className="text-xs">{init.status}</Badge>
                      <ProgressBadge progress={init.progress} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Create Forms */}
      {showCreate === 'initiative' && (
        <CreateModal title="New Strategic Initiative" onClose={() => setShowCreate(null)}>
          <CreateInitiativeForm onClose={() => setShowCreate(null)} />
        </CreateModal>
      )}
      {showCreate === 'okr' && (
        <CreateModal title="New OKR" onClose={() => setShowCreate(null)}>
          <CreateOkrForm onClose={() => setShowCreate(null)} />
        </CreateModal>
      )}
      {showCreate === 'milestone' && (
        <CreateModal title="New Milestone" onClose={() => setShowCreate(null)}>
          <CreateMilestoneForm initiatives={initiatives} onClose={() => setShowCreate(null)} />
        </CreateModal>
      )}
    </div>
  );
}

function CreateModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="heading-display text-lg">{title}</h3>
          <button onClick={onClose} className="text-fg-muted hover:text-fg-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
}

function CreateInitiativeForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('medium');
  const [startDate, setStartDate] = useState('');
  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startDate) return;
    setSubmitting(true);
    try {
      await fetch('/api/strategy/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), priority, startDate, owner, description }),
      });
      onClose();
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-fg-secondary mb-1 block">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" placeholder="Market Expansion" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-fg-secondary mb-1 block">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-fg-secondary mb-1 block">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" required />
        </div>
      </div>
      <div>
        <label className="text-xs text-fg-secondary mb-1 block">Owner</label>
        <input value={owner} onChange={(e) => setOwner(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" placeholder="Person responsible" />
      </div>
      <div>
        <label className="text-xs text-fg-secondary mb-1 block">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" rows={3} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</Button>
      </div>
    </form>
  );
}

function CreateOkrForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [krCount, setKrCount] = useState(1);
  const [keyResults, setKeyResults] = useState<Array<{ name: string; target: string; current: string; unit: string }>>([{ name: '', target: '100', current: '0', unit: 'count' }]);
  const [submitting, setSubmitting] = useState(false);

  function updateKr(idx: number, field: 'name' | 'target' | 'current' | 'unit', value: string) {
    const next = [...keyResults];
    next[idx] = { ...next[idx], [field]: value };
    setKeyResults(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/strategy/okrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          priority,
          description,
          keyResults: keyResults.filter((kr) => kr.name.trim()).map((kr) => ({
            name: kr.name.trim(),
            target: parseFloat(kr.target) || 0,
            current: parseFloat(kr.current) || 0,
            unit: kr.unit,
          })),
        }),
      });
      onClose();
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-fg-secondary mb-1 block">Objective Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" placeholder="Increase revenue by 50%" required />
      </div>
      <div>
        <label className="text-xs text-fg-secondary mb-1 block">Priority</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-fg-secondary mb-1 block">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" rows={2} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-fg-secondary">Key Results</label>
          <button type="button" onClick={() => { setKrCount(krCount + 1); setKeyResults([...keyResults, { name: '', target: '100', current: '0', unit: 'count' }]); }} className="text-xs text-accent-primary">
            + Add KR
          </button>
        </div>
        {keyResults.slice(0, krCount).map((kr, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
            <input value={kr.name} onChange={(e) => updateKr(idx, 'name', e.target.value)} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs col-span-2" placeholder="KR name" />
            <input value={kr.current} onChange={(e) => updateKr(idx, 'current', e.target.value)} type="number" className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs" placeholder="Current" />
            <input value={kr.target} onChange={(e) => updateKr(idx, 'target', e.target.value)} type="number" className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs" placeholder="Target" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create OKR'}</Button>
      </div>
    </form>
  );
}

function CreateMilestoneForm({ initiatives, onClose }: { initiatives: Initiative[]; onClose: () => void }) {
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [initiativeId, setInitiativeId] = useState('');
  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !targetDate) return;
    setSubmitting(true);
    try {
      await fetch('/api/strategy/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), targetDate, initiativeId: initiativeId || undefined, owner, description }),
      });
      onClose();
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-fg-secondary mb-1 block">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" placeholder="Q1 Launch" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-fg-secondary mb-1 block">Target Date</label>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="text-xs text-fg-secondary mb-1 block">Initiative</label>
          <select value={initiativeId} onChange={(e) => setInitiativeId(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">None</option>
            {initiatives.map((init) => (
              <option key={init.id} value={init.id}>{init.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-fg-secondary mb-1 block">Owner</label>
        <input value={owner} onChange={(e) => setOwner(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" placeholder="Person responsible" />
      </div>
      <div>
        <label className="text-xs text-fg-secondary mb-1 block">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" rows={2} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</Button>
      </div>
    </form>
  );
}
