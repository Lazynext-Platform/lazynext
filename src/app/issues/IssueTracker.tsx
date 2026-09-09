'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Bug, Flag, Calendar, TrendingDown, Zap, GitBranch, AlertTriangle,
  CheckCircle, Plus, Search, X, Trash2, MessageSquare, Target,
  ListChecks, Columns3, BarChart3, Inbox,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

// ── Types ──

type IssueType = 'bug' | 'feature' | 'task' | 'enhancement' | 'epic';
type IssuePriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';
type IssueSeverity = 'trivial' | 'minor' | 'major' | 'critical' | 'blocker';
type IssueStatus = 'open' | 'in_progress' | 'in_review' | 'done' | 'closed';
type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';

interface Issue {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  severity: IssueSeverity | null;
  status: IssueStatus;
  assigneeId: string | null;
  reporterId: string | null;
  projectId: string | null;
  sprintId: string | null;
  labels: string[];
  estimatedHours: number | null;
  dueDate: Date | null;
  resolvedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Sprint {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  goal: string;
  status: SprintStatus;
  startDate: Date;
  endDate: Date;
  projectId: string | null;
  completedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IssueComment {
  id: string;
  issueId: string;
  authorId: string;
  content: string;
  edited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface BurndownPoint {
  day: number;
  remaining: number;
}

interface BurndownData {
  ideal: BurndownPoint[];
  actual: BurndownPoint[];
  totalPoints: number;
  daysRemaining: number;
}

interface VelocityEntry {
  sprintId: string;
  sprintName: string;
  points: number;
  issueCount: number;
}

interface IssueStats {
  total: number;
  byType: Record<IssueType, number>;
  byPriority: Record<IssuePriority, number>;
  byStatus: Record<IssueStatus, number>;
  openCount: number;
  closedCount: number;
  avgResolutionMs: number;
}

interface SprintStats {
  total: number;
  byStatus: Record<SprintStatus, number>;
  avgVelocity: number;
  totalIssuesCompleted: number;
}

interface IssueTrackerProps {
  organizationId: string;
  currentUserId: string;
  initialIssues: Issue[];
  initialBacklog: Issue[];
  initialKanban: Record<IssueStatus, Issue[]>;
  initialIssueStats: IssueStats;
  initialSprints: Sprint[];
  initialActiveSprints: Sprint[];
  initialUpcomingSprints: Sprint[];
  initialSprintStats: SprintStats;
  initialVelocity: VelocityEntry[];
  initialBurndown: BurndownData;
}

// ── Style maps ──

const priorityVariant: Record<IssuePriority, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
  critical: 'danger',
};

const statusVariant: Record<IssueStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  open: 'info',
  in_progress: 'accent',
  in_review: 'warning',
  done: 'success',
  closed: 'default',
};

const typeIcon: Record<IssueType, typeof Bug> = {
  bug: Bug,
  feature: Zap,
  task: CheckCircle,
  enhancement: GitBranch,
  epic: Flag,
};

const severityVariant: Record<IssueSeverity, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  trivial: 'default',
  minor: 'info',
  major: 'warning',
  critical: 'danger',
  blocker: 'danger',
};

const KANBAN_COLUMNS: { key: IssueStatus; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review', label: 'In Review' },
  { key: 'done', label: 'Done' },
  { key: 'closed', label: 'Closed' },
];

const ISSUE_TYPES: IssueType[] = ['bug', 'feature', 'task', 'enhancement', 'epic'];
const ISSUE_PRIORITIES: IssuePriority[] = ['low', 'medium', 'high', 'urgent', 'critical'];
const ISSUE_STATUSES: IssueStatus[] = ['open', 'in_progress', 'in_review', 'done', 'closed'];

// ── Component ──

export function IssueTracker({
  organizationId: _organizationId,
  currentUserId,
  initialIssues,
  initialBacklog,
  initialKanban,
  initialIssueStats,
  initialSprints,
  initialActiveSprints,
  initialUpcomingSprints,
  initialSprintStats,
  initialVelocity,
  initialBurndown,
}: IssueTrackerProps) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [backlog, setBacklog] = useState<Issue[]>(initialBacklog);
  const [kanban, setKanban] = useState<Record<IssueStatus, Issue[]>>(initialKanban);
  const [issueStats, setIssueStats] = useState<IssueStats>(initialIssueStats);
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints);
  const [activeSprints, setActiveSprints] = useState<Sprint[]>(initialActiveSprints);
  const [upcomingSprints, setUpcomingSprints] = useState<Sprint[]>(initialUpcomingSprints);
  const [sprintStats, setSprintStats] = useState<SprintStats>(initialSprintStats);
  const [velocity, setVelocity] = useState<VelocityEntry[]>(initialVelocity);
  const [burndown, setBurndown] = useState<BurndownData>(initialBurndown);

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<IssueType | ''>('');
  const [filterPriority, setFilterPriority] = useState<IssuePriority | ''>('');
  const [filterStatus, setFilterStatus] = useState<IssueStatus | ''>('');
  const [filterAssignee, setFilterAssignee] = useState('');

  // View mode
  const [view, setView] = useState<'list' | 'kanban' | 'backlog' | 'sprints' | 'stats'>('list');

  // Create forms
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    type: 'task' as IssueType,
    priority: 'medium' as IssuePriority,
    estimatedHours: '',
  });
  const [newSprint, setNewSprint] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
  });

  const filteredIssues = issues.filter((i) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false;
    }
    if (filterType && i.type !== filterType) return false;
    if (filterPriority && i.priority !== filterPriority) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    if (filterAssignee && i.assigneeId !== filterAssignee) return false;
    return true;
  });

  const loadIssueDetail = useCallback(async (issueId: string) => {
    setLoading(true);
    try {
      const [issueRes, commentsRes] = await Promise.all([
        fetch(`/api/issues/${issueId}`),
        fetch(`/api/issues/${issueId}/comments`),
      ]);
      const issueData = await issueRes.json().catch(() => ({ issue: null }));
      const commentsData = await commentsRes.json().catch(() => ({ comments: [] }));
      setSelectedIssue(issueData.issue ?? null);
      setComments(commentsData.comments ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedIssueId) {
      loadIssueDetail(selectedIssueId);
    }
  }, [selectedIssueId, loadIssueDetail]);

  async function refreshIssues() {
    const [listRes, backlogRes, kanbanRes, statsRes] = await Promise.all([
      fetch('/api/issues'),
      fetch('/api/issues/backlog'),
      fetch('/api/issues/kanban'),
      fetch('/api/issues/stats'),
    ]);
    const listData = await listRes.json().catch(() => ({ issues: [] }));
    const backlogData = await backlogRes.json().catch(() => ({ issues: [] }));
    const kanbanData = await kanbanRes.json().catch(() => ({ columns: initialKanban }));
    const statsData = await statsRes.json().catch(() => ({ stats: initialIssueStats }));
    setIssues(listData.issues ?? []);
    setBacklog(backlogData.issues ?? []);
    setKanban(kanbanData.columns ?? initialKanban);
    setIssueStats(statsData.stats ?? initialIssueStats);
  }

  async function refreshSprints() {
    const [listRes, activeRes, upcomingRes, statsRes, velRes] = await Promise.all([
      fetch('/api/sprints'),
      fetch('/api/sprints/active'),
      fetch('/api/sprints/upcoming'),
      fetch('/api/sprints/stats'),
      fetch('/api/sprints/velocity'),
    ]);
    const listData = await listRes.json().catch(() => ({ sprints: [] }));
    const activeData = await activeRes.json().catch(() => ({ sprints: [] }));
    const upcomingData = await upcomingRes.json().catch(() => ({ sprints: [] }));
    const statsData = await statsRes.json().catch(() => ({ stats: initialSprintStats }));
    const velData = await velRes.json().catch(() => ({ velocity: [] }));
    setSprints(listData.sprints ?? []);
    setActiveSprints(activeData.sprints ?? []);
    setUpcomingSprints(upcomingData.sprints ?? []);
    setSprintStats(statsData.stats ?? initialSprintStats);
    setVelocity(velData.velocity ?? []);

    if (activeData.sprints?.length > 0) {
      const bdRes = await fetch(`/api/sprints/${activeData.sprints[0].id}/burndown`);
      const bdData = await bdRes.json().catch(() => ({ burndown: initialBurndown }));
      setBurndown(bdData.burndown ?? initialBurndown);
    }
  }

  async function handleCreateIssue() {
    if (!newIssue.title.trim()) return;
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newIssue.title,
          description: newIssue.description,
          type: newIssue.type,
          priority: newIssue.priority,
          estimatedHours: newIssue.estimatedHours ? Number(newIssue.estimatedHours) : undefined,
        }),
      });
      const data = await res.json();
      if (data.issue) {
        setNewIssue({ title: '', description: '', type: 'task', priority: 'medium', estimatedHours: '' });
        setShowCreateIssue(false);
        await refreshIssues();
      }
    } catch { /* ignore */ }
  }

  async function handleCreateSprint() {
    if (!newSprint.name.trim() || !newSprint.startDate || !newSprint.endDate) return;
    try {
      const res = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSprint.name,
          goal: newSprint.goal,
          startDate: newSprint.startDate,
          endDate: newSprint.endDate,
        }),
      });
      const data = await res.json();
      if (data.sprint) {
        setNewSprint({ name: '', goal: '', startDate: '', endDate: '' });
        setShowCreateSprint(false);
        await refreshSprints();
      }
    } catch { /* ignore */ }
  }

  async function handleStatusChange(issueId: string, status: IssueStatus) {
    try {
      await fetch(`/api/issues/${issueId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await refreshIssues();
      if (selectedIssueId === issueId) {
        setSelectedIssue((prev) => prev ? { ...prev, status } : null);
      }
    } catch { /* ignore */ }
  }

  async function handleAddComment() {
    if (!commentInput.trim() || !selectedIssueId) return;
    const content = commentInput.trim();
    setCommentInput('');
    try {
      const res = await fetch(`/api/issues/${selectedIssueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
      }
    } catch { /* ignore */ }
  }

  async function handleDeleteIssue(issueId: string) {
    try {
      await fetch(`/api/issues/${issueId}`, { method: 'DELETE' });
      if (selectedIssueId === issueId) {
        setSelectedIssueId(null);
        setSelectedIssue(null);
      }
      await refreshIssues();
    } catch { /* ignore */ }
  }

  async function handleStartSprint(sprintId: string) {
    try {
      await fetch(`/api/sprints/${sprintId}/start`, { method: 'POST' });
      await refreshSprints();
    } catch { /* ignore */ }
  }

  async function handleCompleteSprint(sprintId: string) {
    try {
      await fetch(`/api/sprints/${sprintId}/complete`, { method: 'POST' });
      await refreshSprints();
    } catch { /* ignore */ }
  }

  async function handleMoveToBacklog(issueId: string) {
    try {
      await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sprintId: null }),
      });
      await refreshIssues();
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Total Issues</div>
          <div className="text-xl font-bold">{issueStats.total}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Open</div>
          <div className="text-xl font-bold">{issueStats.openCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Closed</div>
          <div className="text-xl font-bold">{issueStats.closedCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Active Sprints</div>
          <div className="text-xl font-bold">{activeSprints.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Avg Velocity</div>
          <div className="text-xl font-bold">{sprintStats.avgVelocity}h</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Backlog</div>
          <div className="text-xl font-bold">{backlog.length}</div>
        </Card>
      </div>

      {/* View Tabs + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {([
            ['list', 'List', ListChecks],
            ['kanban', 'Kanban', Columns3],
            ['backlog', 'Backlog', Inbox],
            ['sprints', 'Sprints', Target],
            ['stats', 'Stats', BarChart3],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg ${view === key ? 'bg-accent-primary text-white' : 'text-fg-secondary hover:bg-fg-muted/10'}`}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowCreateSprint(true)}>
            <Plus className="h-3 w-3" /> New Sprint
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreateIssue(true)}>
            <Plus className="h-3 w-3" /> New Issue
          </Button>
        </div>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <Card className="p-3">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap mb-3">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-fg-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search issues..."
                  className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-lg bg-transparent"
                />
              </div>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as IssueType | '')} className="text-xs border rounded-lg px-2 py-1.5 bg-transparent">
                <option value="">All Types</option>
                {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as IssuePriority | '')} className="text-xs border rounded-lg px-2 py-1.5 bg-transparent">
                <option value="">All Priorities</option>
                {ISSUE_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as IssueStatus | '')} className="text-xs border rounded-lg px-2 py-1.5 bg-transparent">
                <option value="">All Statuses</option>
                {ISSUE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                type="text"
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                placeholder="Assignee ID"
                className="text-xs border rounded-lg px-2 py-1.5 bg-transparent w-28"
              />
            </div>

            {/* Issue list */}
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {filteredIssues.length === 0 ? (
                <div className="text-sm text-fg-secondary text-center py-8">No issues found.</div>
              ) : (
                filteredIssues.map((issue) => {
                  const Icon = typeIcon[issue.type] ?? Bug;
                  return (
                    <button
                      key={issue.id}
                      onClick={() => setSelectedIssueId(issue.id)}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm transition-colors ${selectedIssueId === issue.id ? 'bg-accent-primary/10' : 'hover:bg-fg-muted/10'}`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0 text-accent-primary" />
                      <span className="truncate flex-1">{issue.title}</span>
                      <Badge variant={priorityVariant[issue.priority]} className="text-xs">{issue.priority}</Badge>
                      <Badge variant={statusVariant[issue.status]} className="text-xs">{issue.status}</Badge>
                      {issue.estimatedHours != null && (
                        <span className="text-xs text-fg-muted">{issue.estimatedHours}h</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* Issue Detail Panel */}
          <Card className="p-3 max-h-[70vh] overflow-y-auto">
            {loading && <div className="text-sm text-fg-secondary text-center py-4">Loading...</div>}
            {!loading && !selectedIssue && (
              <div className="text-sm text-fg-secondary text-center py-8">Select an issue to view details.</div>
            )}
            {!loading && selectedIssue && (
              <IssueDetail
                issue={selectedIssue}
                comments={comments}
                currentUserId={currentUserId}
                commentInput={commentInput}
                setCommentInput={setCommentInput}
                onAddComment={handleAddComment}
                onStatusChange={(status) => handleStatusChange(selectedIssue.id, status)}
                onDelete={() => handleDeleteIssue(selectedIssue.id)}
                onMoveToBacklog={() => handleMoveToBacklog(selectedIssue.id)}
                onClose={() => { setSelectedIssueId(null); setSelectedIssue(null); }}
              />
            )}
          </Card>
        </div>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {KANBAN_COLUMNS.map((col) => (
            <Card key={col.key} className="p-2 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-medium">{col.label}</span>
                <Badge variant={statusVariant[col.key]} className="text-xs">{kanban[col.key]?.length ?? 0}</Badge>
              </div>
              <div className="space-y-1">
                {(kanban[col.key] ?? []).map((issue) => {
                  const Icon = typeIcon[issue.type] ?? Bug;
                  return (
                    <button
                      key={issue.id}
                      onClick={() => { setSelectedIssueId(issue.id); setView('list'); }}
                      className="w-full text-left p-2 border rounded-lg text-xs hover:bg-fg-muted/10"
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Icon className="h-3 w-3 text-accent-primary" />
                        <span className="truncate font-medium">{issue.title}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant={priorityVariant[issue.priority]} className="text-xs">{issue.priority}</Badge>
                        {issue.estimatedHours != null && <span className="text-fg-muted">{issue.estimatedHours}h</span>}
                      </div>
                    </button>
                  );
                })}
                {(kanban[col.key]?.length ?? 0) === 0 && (
                  <div className="text-xs text-fg-secondary text-center py-4">No issues</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Backlog View */}
      {view === 'backlog' && (
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Backlog — issues not assigned to a sprint</h2>
            <Badge variant="info" className="text-xs">{backlog.length}</Badge>
          </div>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {backlog.length === 0 ? (
              <div className="text-sm text-fg-secondary text-center py-8">Backlog is empty. All issues are assigned to sprints.</div>
            ) : (
              backlog.map((issue) => {
                const Icon = typeIcon[issue.type] ?? Bug;
                return (
                  <button
                    key={issue.id}
                    onClick={() => { setSelectedIssueId(issue.id); setView('list'); }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm hover:bg-fg-muted/10"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0 text-accent-primary" />
                    <span className="truncate flex-1">{issue.title}</span>
                    <Badge variant={priorityVariant[issue.priority]} className="text-xs">{issue.priority}</Badge>
                    <Badge variant={statusVariant[issue.status]} className="text-xs">{issue.status}</Badge>
                  </button>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* Sprints View */}
      {view === 'sprints' && (
        <div className="space-y-4">
          {/* Active Sprint + Burndown */}
          {activeSprints.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-accent-primary" />
                  <h2 className="heading-display text-sm">Active Sprint</h2>
                </div>
                <SprintCard sprint={activeSprints[0]} onComplete={() => handleCompleteSprint(activeSprints[0].id)} />
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-accent-primary" />
                  <h2 className="heading-display text-sm">Burndown</h2>
                </div>
                <BurndownChart burndown={burndown} />
              </Card>
            </div>
          )}

          {/* Velocity Chart */}
          {velocity.length > 0 && (
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-accent-primary" />
                <h2 className="heading-display text-sm">Velocity</h2>
              </div>
              <VelocityChart velocity={velocity} />
            </Card>
          )}

          {/* Upcoming Sprints */}
          {upcomingSprints.length > 0 && (
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-accent-primary" />
                <h2 className="heading-display text-sm">Upcoming Sprints</h2>
              </div>
              <div className="space-y-2">
                {upcomingSprints.map((sprint) => (
                  <SprintCard key={sprint.id} sprint={sprint} onStart={() => handleStartSprint(sprint.id)} />
                ))}
              </div>
            </Card>
          )}

          {/* All Sprints */}
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-accent-primary" />
              <h2 className="heading-display text-sm">All Sprints</h2>
              <Badge variant="info" className="text-xs">{sprints.length}</Badge>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {sprints.length === 0 ? (
                <div className="text-sm text-fg-secondary text-center py-8">No sprints yet.</div>
              ) : (
                sprints.map((sprint) => (
                  <SprintCard key={sprint.id} sprint={sprint} compact />
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Stats View */}
      {view === 'stats' && (
        <div className="space-y-4">
          <Card className="p-3">
            <h3 className="text-sm font-medium mb-2">Issues by Type</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ISSUE_TYPES.map((t) => (
                <StatBox key={t} label={t} value={issueStats.byType[t] ?? 0} />
              ))}
            </div>
          </Card>
          <Card className="p-3">
            <h3 className="text-sm font-medium mb-2">Issues by Priority</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ISSUE_PRIORITIES.map((p) => (
                <StatBox key={p} label={p} value={issueStats.byPriority[p] ?? 0} />
              ))}
            </div>
          </Card>
          <Card className="p-3">
            <h3 className="text-sm font-medium mb-2">Issues by Status</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ISSUE_STATUSES.map((s) => (
                <StatBox key={s} label={s} value={issueStats.byStatus[s] ?? 0} />
              ))}
            </div>
          </Card>
          <Card className="p-3">
            <h3 className="text-sm font-medium mb-2">Sprint Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatBox label="Total Sprints" value={sprintStats.total} />
              <StatBox label="Completed" value={sprintStats.byStatus.completed ?? 0} />
              <StatBox label="Avg Velocity" value={sprintStats.avgVelocity} />
              <StatBox label="Issues Completed" value={sprintStats.totalIssuesCompleted} />
            </div>
          </Card>
        </div>
      )}

      {/* Create Issue Modal */}
      {showCreateIssue && (
        <Modal title="Create Issue" onClose={() => setShowCreateIssue(false)}>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Issue title"
              value={newIssue.title}
              onChange={(e) => setNewIssue((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
            />
            <textarea
              placeholder="Description (optional)"
              value={newIssue.description}
              onChange={(e) => setNewIssue((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent min-h-[80px]"
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={newIssue.type} onChange={(e) => setNewIssue((p) => ({ ...p, type: e.target.value as IssueType }))} className="text-sm border rounded-lg px-2 py-2 bg-transparent">
                {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={newIssue.priority} onChange={(e) => setNewIssue((p) => ({ ...p, priority: e.target.value as IssuePriority }))} className="text-sm border rounded-lg px-2 py-2 bg-transparent">
                {ISSUE_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <input
              type="number"
              placeholder="Estimated hours (optional)"
              value={newIssue.estimatedHours}
              onChange={(e) => setNewIssue((p) => ({ ...p, estimatedHours: e.target.value }))}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreateIssue(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleCreateIssue} disabled={!newIssue.title.trim()}>Create</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Sprint Modal */}
      {showCreateSprint && (
        <Modal title="Create Sprint" onClose={() => setShowCreateSprint(false)}>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Sprint name"
              value={newSprint.name}
              onChange={(e) => setNewSprint((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
            />
            <textarea
              placeholder="Sprint goal (optional)"
              value={newSprint.goal}
              onChange={(e) => setNewSprint((p) => ({ ...p, goal: e.target.value }))}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent min-h-[60px]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={newSprint.startDate}
                onChange={(e) => setNewSprint((p) => ({ ...p, startDate: e.target.value }))}
                className="text-sm border rounded-lg px-2 py-2 bg-transparent"
              />
              <input
                type="date"
                value={newSprint.endDate}
                onChange={(e) => setNewSprint((p) => ({ ...p, endDate: e.target.value }))}
                className="text-sm border rounded-lg px-2 py-2 bg-transparent"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreateSprint(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleCreateSprint} disabled={!newSprint.name.trim() || !newSprint.startDate || !newSprint.endDate}>Create</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sub-components ──

function IssueDetail({
  issue,
  comments,
  currentUserId,
  commentInput,
  setCommentInput,
  onAddComment,
  onStatusChange,
  onDelete,
  onMoveToBacklog,
  onClose,
}: {
  issue: Issue;
  comments: IssueComment[];
  currentUserId: string;
  commentInput: string;
  setCommentInput: (v: string) => void;
  onAddComment: () => void;
  onStatusChange: (status: IssueStatus) => void;
  onDelete: () => void;
  onMoveToBacklog: () => void;
  onClose: () => void;
}) {
  const Icon = typeIcon[issue.type] ?? Bug;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent-primary" />
          <h3 className="text-sm font-medium">{issue.title}</h3>
        </div>
        <button onClick={onClose} className="text-fg-muted hover:text-fg-primary"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant={priorityVariant[issue.priority]} className="text-xs">{issue.priority}</Badge>
        <Badge variant={statusVariant[issue.status]} className="text-xs">{issue.status}</Badge>
        <Badge variant="default" className="text-xs">{issue.type}</Badge>
        {issue.severity && <Badge variant={severityVariant[issue.severity]} className="text-xs">{issue.severity}</Badge>}
      </div>

      {issue.description && (
        <div className="text-sm text-fg-secondary whitespace-pre-wrap break-words">{issue.description}</div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-fg-muted">Assignee:</span> {issue.assigneeId ?? 'Unassigned'}</div>
        <div><span className="text-fg-muted">Reporter:</span> {issue.reporterId ?? '—'}</div>
        <div><span className="text-fg-muted">Est:</span> {issue.estimatedHours != null ? `${issue.estimatedHours}h` : '—'}</div>
        <div><span className="text-fg-muted">Due:</span> {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '—'}</div>
        <div><span className="text-fg-muted">Sprint:</span> {issue.sprintId ?? 'Backlog'}</div>
        <div><span className="text-fg-muted">Project:</span> {issue.projectId ?? '—'}</div>
      </div>

      {issue.labels.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {issue.labels.map((label) => (
            <Badge key={label} variant="default" className="text-xs">{label}</Badge>
          ))}
        </div>
      )}

      {/* Status changer */}
      <div className="flex gap-1 flex-wrap">
        {ISSUE_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className={`px-2 py-1 text-xs rounded ${issue.status === s ? 'bg-accent-primary text-white' : 'border hover:bg-fg-muted/10'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="text-xs" onClick={onMoveToBacklog}>
          <Inbox className="h-3 w-3" /> Move to Backlog
        </Button>
        <Button variant="danger" size="sm" className="text-xs" onClick={onDelete}>
          <Trash2 className="h-3 w-3" /> Delete
        </Button>
      </div>

      {/* Comments */}
      <div className="pt-2 border-t">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-3 w-3 text-accent-primary" />
          <h4 className="text-xs font-medium">Comments ({comments.length})</h4>
        </div>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {comments.length === 0 ? (
            <div className="text-xs text-fg-secondary text-center py-2">No comments yet.</div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="p-2 border rounded-lg text-xs">
                <div className="flex items-center gap-1 mb-1">
                  <span className="font-mono text-fg-muted">{c.authorId.slice(0, 8)}</span>
                  {c.authorId === currentUserId && <Badge variant="info" className="text-xs">You</Badge>}
                  {c.edited && <span className="text-fg-muted">(edited)</span>}
                </div>
                <div className="whitespace-pre-wrap break-words">{c.content}</div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-1 mt-2">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddComment()}
            placeholder="Add a comment..."
            className="flex-1 px-2 py-1 text-xs border rounded-lg bg-transparent"
          />
          <Button variant="primary" size="sm" className="text-xs" onClick={onAddComment} disabled={!commentInput.trim()}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SprintCard({
  sprint,
  onStart,
  onComplete,
  compact,
}: {
  sprint: Sprint;
  onStart?: () => void;
  onComplete?: () => void;
  compact?: boolean;
}) {
  const statusVariantMap: Record<SprintStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
    planning: 'info',
    active: 'accent',
    completed: 'success',
    cancelled: 'default',
  };
  return (
    <div className="p-2 border rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{sprint.name}</span>
        <Badge variant={statusVariantMap[sprint.status]} className="text-xs">{sprint.status}</Badge>
      </div>
      {sprint.goal && <div className="text-xs text-fg-secondary mb-1">{sprint.goal}</div>}
      {!compact && (
        <div className="text-xs text-fg-muted">
          {new Date(sprint.startDate).toLocaleDateString()} → {new Date(sprint.endDate).toLocaleDateString()}
        </div>
      )}
      {!compact && (onStart || onComplete) && (
        <div className="flex gap-1 mt-2">
          {onStart && sprint.status === 'planning' && (
            <Button variant="secondary" size="sm" className="text-xs" onClick={onStart}>
              <Zap className="h-3 w-3" /> Start
            </Button>
          )}
          {onComplete && sprint.status === 'active' && (
            <Button variant="secondary" size="sm" className="text-xs" onClick={onComplete}>
              <CheckCircle className="h-3 w-3" /> Complete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function BurndownChart({ burndown }: { burndown: BurndownData }) {
  if (burndown.ideal.length === 0) {
    return <div className="text-sm text-fg-secondary text-center py-8">No burndown data available.</div>;
  }
  const maxPoints = burndown.totalPoints || 1;
  const totalDays = burndown.ideal.length - 1 || 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-fg-secondary">Total: {burndown.totalPoints}h</span>
        <span className="text-fg-secondary">Days left: {burndown.daysRemaining}</span>
      </div>
      <div className="relative h-40 border rounded-lg p-2">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Ideal line */}
          <polyline
            fill="none"
            stroke="var(--c-fg-muted, #999)"
            strokeWidth="0.5"
            strokeDasharray="2,2"
            points={burndown.ideal.map((p) => `${(p.day / totalDays) * 100},${100 - (p.remaining / maxPoints) * 100}`).join(' ')}
          />
          {/* Actual line */}
          {burndown.actual.length > 0 && (
            <polyline
              fill="none"
              stroke="var(--c-accent, #3b82f6)"
              strokeWidth="1"
              points={burndown.actual.map((p) => `${(p.day / totalDays) * 100},${100 - (p.remaining / maxPoints) * 100}`).join(' ')}
            />
          )}
        </svg>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-fg-muted" /> Ideal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-accent-primary" /> Actual
        </span>
      </div>
    </div>
  );
}

function VelocityChart({ velocity }: { velocity: VelocityEntry[] }) {
  if (velocity.length === 0) {
    return <div className="text-sm text-fg-secondary text-center py-4">No velocity data yet.</div>;
  }
  const maxPoints = Math.max(...velocity.map((v) => v.points), 1);
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2 h-32">
        {velocity.map((v) => (
          <div key={v.sprintId} className="flex-1 flex flex-col items-center justify-end">
            <span className="text-xs text-fg-secondary mb-1">{v.points}h</span>
            <div
              className="w-full bg-accent-primary rounded-t"
              style={{ height: `${(v.points / maxPoints) * 100}%`, minHeight: '4px' }}
            />
            <span className="text-xs text-fg-muted mt-1 truncate w-full text-center">{v.sprintName}</span>
          </div>
        ))}
      </div>
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

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-surface border rounded-xl p-4 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="heading-display text-sm">{title}</h3>
          <button onClick={onClose} className="text-fg-muted hover:text-fg-primary"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
