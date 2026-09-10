'use client';

import { useState, useMemo } from 'react';
import {
  Lightbulb, Rocket, FileText, TrendingUp, Trophy,
  Search, BarChart3, Target,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type IdeaCategory = 'product' | 'process' | 'service' | 'business_model' | 'technology' | 'customer_experience';
type IdeaStage = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'in_development' | 'launched' | 'archived';
type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
type PatentStatus = 'idea' | 'filing_preparation' | 'filed' | 'under_review' | 'granted' | 'rejected' | 'abandoned';
type PatentType = 'utility' | 'design' | 'plant' | 'provisional';
type ChallengeStatus = 'open' | 'judging' | 'closed';
type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

interface Milestone {
  name: string;
  dueDate: string | null;
  status: MilestoneStatus;
}

interface Idea {
  id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  submittedBy: string;
  stage: IdeaStage;
  tags: string[];
  estimatedValue: number | null;
  estimatedEffort: number | null;
  votes: string[];
  createdAt: Date;
}

interface Project {
  id: string;
  name: string;
  description: string;
  category: IdeaCategory;
  status: ProjectStatus;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  teamLead: string;
  teamMembers: string[];
  milestones: Milestone[];
  successMetrics: string[];
  createdAt: Date;
}

interface Patent {
  id: string;
  title: string;
  applicationNumber: string;
  filingDate: Date | null;
  status: PatentStatus;
  inventor: string;
  assignee: string;
  patentType: PatentType;
  jurisdiction: string;
  grantedDate: Date | null;
  createdAt: Date;
}

interface Metric {
  id: string;
  name: string;
  category: string;
  value: number;
  unit: string;
  period: string;
  target: number | null;
  previousValue: number | null;
  trend: string;
  createdAt: Date;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: IdeaCategory;
  prize: string;
  deadline: Date | null;
  status: ChallengeStatus;
  participants: string[];
  submissions: string[];
  winnerId: string | null;
  criteria: string[];
  createdAt: Date;
}

interface InnovationMetricsSummary {
  ideasByStage: Record<string, number>;
  totalIdeas: number;
  activeProjects: number;
  totalProjects: number;
  patentsByStatus: Record<string, number>;
  totalPatents: number;
  avgTimeToLaunch: number;
  launchedIdeas: number;
  innovationROI: number;
  totalEstimatedValue: number;
  totalEstimatedEffort: number;
}

interface InnovationStats {
  ideaCount: number;
  projectCount: number;
  patentCount: number;
  metricCount: number;
  challengeCount: number;
  openChallengeCount: number;
  activeProjectCount: number;
  launchedIdeaCount: number;
  byIdeaStage: Record<string, number>;
  byProjectStatus: Record<string, number>;
  byPatentStatus: Record<string, number>;
  byChallengeStatus: Record<string, number>;
}

interface InnovationDashboardProps {
  organizationId: string;
  ideas: Idea[];
  projects: Project[];
  patents: Patent[];
  metrics: Metric[];
  challenges: Challenge[];
  metricsSummary: InnovationMetricsSummary;
  stats: InnovationStats;
}

// ── Helpers ──

const ideaStageVariant: Record<IdeaStage, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  submitted: 'info',
  under_review: 'accent',
  approved: 'success',
  rejected: 'danger',
  in_development: 'warning',
  launched: 'success',
  archived: 'default',
};

const projectStatusVariant: Record<ProjectStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  planning: 'info',
  active: 'accent',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'default',
};

const patentStatusVariant: Record<PatentStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  idea: 'info',
  filing_preparation: 'accent',
  filed: 'warning',
  under_review: 'accent',
  granted: 'success',
  rejected: 'danger',
  abandoned: 'default',
};

const challengeStatusVariant: Record<ChallengeStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  open: 'success',
  judging: 'warning',
  closed: 'default',
};

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Component ──

type TabId = 'overview' | 'ideas' | 'projects' | 'patents' | 'metrics' | 'challenges';

export function InnovationDashboard({
  organizationId: _organizationId,
  ideas,
  projects,
  patents,
  metrics,
  challenges,
  metricsSummary,
  stats,
}: InnovationDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredIdeas = useMemo(() => {
    if (!search) return ideas;
    const q = search.toLowerCase();
    return ideas.filter(
      (i) => i.title.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.submittedBy.toLowerCase().includes(q),
    );
  }, [ideas, search]);

  const filteredProjects = useMemo(() => {
    if (!search) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.teamLead.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );
  }, [projects, search]);

  const filteredPatents = useMemo(() => {
    if (!search) return patents;
    const q = search.toLowerCase();
    return patents.filter(
      (p) => p.title.toLowerCase().includes(q) || p.inventor.toLowerCase().includes(q) || p.jurisdiction.toLowerCase().includes(q),
    );
  }, [patents, search]);

  const filteredMetrics = useMemo(() => {
    if (!search) return metrics;
    const q = search.toLowerCase();
    return metrics.filter(
      (m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.period.toLowerCase().includes(q),
    );
  }, [metrics, search]);

  const filteredChallenges = useMemo(() => {
    if (!search) return challenges;
    const q = search.toLowerCase();
    return challenges.filter(
      (c) => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q),
    );
  }, [challenges, search]);

  const tabs: { id: TabId; label: string; icon: typeof Lightbulb }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'ideas', label: 'Ideas', icon: Lightbulb },
    { id: 'projects', label: 'Projects', icon: Rocket },
    { id: 'patents', label: 'Patents', icon: FileText },
    { id: 'metrics', label: 'Metrics', icon: TrendingUp },
    { id: 'challenges', label: 'Challenges', icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Ideas</span>
          </div>
          <p className="text-2xl font-semibold">{stats.ideaCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.launchedIdeaCount} launched</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Projects</span>
          </div>
          <p className="text-2xl font-semibold">{stats.projectCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeProjectCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Patents</span>
          </div>
          <p className="text-2xl font-semibold">{stats.patentCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{metricsSummary.totalPatents} total</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Challenges</span>
          </div>
          <p className="text-2xl font-semibold">{stats.challengeCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.openChallengeCount} open</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-alt text-fg-secondary hover:text-fg-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      {tab !== 'overview' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>
      )}

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Innovation Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Total ideas</span>
                  <span className="font-medium">{metricsSummary.totalIdeas}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Active projects</span>
                  <span className="font-medium">{metricsSummary.activeProjects}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Launched ideas</span>
                  <span className="font-medium">{metricsSummary.launchedIdeas}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Avg time to launch</span>
                  <span className="font-medium">{metricsSummary.avgTimeToLaunch} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Innovation ROI</span>
                  <span className="font-medium">{metricsSummary.innovationROI}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Est. value / effort</span>
                  <span>{metricsSummary.totalEstimatedValue} / {metricsSummary.totalEstimatedEffort}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Counts</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Ideas</span>
                  <span className="font-medium">{stats.ideaCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Projects</span>
                  <span className="font-medium">{stats.projectCount} ({stats.activeProjectCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Patents</span>
                  <span className="font-medium">{stats.patentCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Metrics</span>
                  <span className="font-medium">{stats.metricCount}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Challenges</span>
                  <span>{stats.challengeCount} ({stats.openChallengeCount} open)</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Active Projects</h3>
            {projects.filter((p) => p.status === 'active').length === 0 ? (
              <p className="text-sm text-fg-secondary">No active projects.</p>
            ) : (
              <div className="space-y-2">
                {projects.filter((p) => p.status === 'active').slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-fg-secondary">{p.category} · {p.teamLead || '—'}</p>
                    </div>
                    <Badge variant={projectStatusVariant[p.status]}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'ideas' && (
        <div className="space-y-4">
          {filteredIdeas.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Lightbulb}
                title="No ideas"
                description="Submitted ideas will appear here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredIdeas.map((i) => (
                <Card key={i.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{i.title}</h3>
                      <p className="text-xs text-fg-secondary">{i.category} · {i.submittedBy}</p>
                    </div>
                    <Badge variant={ideaStageVariant[i.stage]}>{i.stage}</Badge>
                  </div>
                  {i.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{i.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Votes</span>
                      <span className="font-medium">{i.votes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Est. value</span>
                      <span className="font-medium">{i.estimatedValue ?? '—'}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'projects' && (
        <div className="space-y-4">
          {filteredProjects.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Rocket}
                title="No projects"
                description="Innovation projects will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Team Lead</th>
                    <th className="p-3 font-medium">Budget</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3 capitalize">{p.category}</td>
                      <td className="p-3">{p.teamLead || '—'}</td>
                      <td className="p-3">{p.budget != null ? `$${p.budget}` : '—'}</td>
                      <td className="p-3">
                        <Badge variant={projectStatusVariant[p.status]}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'patents' && (
        <div className="space-y-4">
          {filteredPatents.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FileText}
                title="No patents"
                description="Patent applications will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">App #</th>
                    <th className="p-3 font-medium">Inventor</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatents.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{p.title}</td>
                      <td className="p-3">{p.applicationNumber || '—'}</td>
                      <td className="p-3">{p.inventor || '—'}</td>
                      <td className="p-3 capitalize">{p.patentType}</td>
                      <td className="p-3">
                        <Badge variant={patentStatusVariant[p.status]}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'metrics' && (
        <div className="space-y-4">
          {filteredMetrics.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={TrendingUp}
                title="No metrics"
                description="Innovation metrics will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Value</th>
                    <th className="p-3 font-medium">Target</th>
                    <th className="p-3 font-medium">Period</th>
                    <th className="p-3 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMetrics.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{m.name}</td>
                      <td className="p-3">{m.category || '—'}</td>
                      <td className="p-3">{m.value} {m.unit}</td>
                      <td className="p-3">{m.target != null ? `${m.target} ${m.unit}` : '—'}</td>
                      <td className="p-3">{m.period || '—'}</td>
                      <td className="p-3">{m.trend || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'challenges' && (
        <div className="space-y-4">
          {filteredChallenges.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Trophy}
                title="No challenges"
                description="Innovation challenges will appear here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredChallenges.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{c.title}</h3>
                      <p className="text-xs text-fg-secondary">{c.category}</p>
                    </div>
                    <Badge variant={challengeStatusVariant[c.status]}>{c.status}</Badge>
                  </div>
                  {c.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{c.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Prize</span>
                      <span className="font-medium">{c.prize || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Deadline</span>
                      <span className="font-medium">{formatDate(c.deadline)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Participants</span>
                      <span className="font-medium">{c.participants.length}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
