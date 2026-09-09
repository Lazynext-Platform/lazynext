import Link from 'next/link';
import type { Metadata } from 'next';
import { Building2, Plus, ArrowRight, Target, TrendingUp, Bot, Zap, Activity, Clock, CheckCircle, AlertCircle, Users, ShoppingBag, DollarSign, Package, ClipboardList } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Company — Lazynext',
  description: 'Your company operating system — mission, goals, agents, and autonomous work.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { CompanyService } from '@/lib/services/company';
import { GoalService } from '@/lib/services/goal';
import { safePrisma } from '@/lib/safe-prisma';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function CompanyPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const companies = await CompanyService.listForUser(session.user.id);

  if (companies.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Company</h1>
          <p className="text-sm text-fg-secondary mt-1">Define your company. Let Lazynext plan, execute, and grow it.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Building2}
            title="No company yet"
            description="Create your first company to start operating autonomously. Describe your business, and Lazynext will help you plan, execute, and measure."
            action={<Button href="/company/new"><Plus className="h-4 w-4" /> Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const company = companies[0];
  const companyDetail = await CompanyService.get(company.id);

  // Fetch goals, agents, recent events, agent runs, job stats in parallel
  const [goals, agents, recentEvents, pendingApprovals, recentRuns, jobStats] = await Promise.all([
    safePrisma(() => prisma.goal.findMany({
      where: { organizationId: company.id, status: 'active' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    }), []),
    safePrisma(() => prisma.agentDef.findMany({
      where: { workspace: { organizationId: company.id }, enabled: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }), []),
    safePrisma(() => prisma.event.findMany({
      where: { organizationId: company.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }), []),
    safePrisma(() => prisma.approval.findMany({
      where: { organizationId: company.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }), []),
    safePrisma(() => prisma.agentRun.findMany({
      where: { agent: { workspace: { organizationId: company.id } } },
      orderBy: { startedAt: 'desc' },
      take: 5,
      select: { id: true, status: true, startedAt: true, completedAt: true, costCredits: true, agent: { select: { name: true } } },
    }), []),
    safePrisma(() => prisma.scheduledJob.groupBy({
      by: ['status'],
      where: { workspace: { organizationId: company.id } },
      _count: true,
    }), []),
  ]);

  // Parse job stats
  const jobStatsMap: Record<string, number> = {};
  for (const stat of jobStats) {
    jobStatsMap[stat.status] = stat._count;
  }

  const autonomyMode = companyDetail?.autonomyMode || 'manual';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Company Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="heading-display text-2xl">{company.name}</h1>
            <p className="text-sm text-fg-secondary mt-1">
              {companyDetail?.industry || 'Company'} · {companyDetail?.workspaceCount} workspace{companyDetail?.workspaceCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant={autonomyMode === 'autonomous' ? 'success' : 'default'}>
              <Zap className="h-3 w-3 mr-1" /> {autonomyMode}
            </Badge>
            <Button href="/company/new" variant="secondary" size="sm">
              <Plus className="h-4 w-4" /> New
            </Button>
          </div>
        </div>
        {companyDetail?.mission && (
          <p className="mt-4 text-fg-secondary text-sm max-w-3xl">{companyDetail.mission}</p>
        )}
      </div>

      {/* Company Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Target className="h-3 w-3" /> Goals
          </div>
          <div className="text-2xl font-semibold">{companyDetail?.goalCount || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Bot className="h-3 w-3" /> Agents
          </div>
          <div className="text-2xl font-semibold">{agents.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <TrendingUp className="h-3 w-3" /> Workspaces
          </div>
          <div className="text-2xl font-semibold">{companyDetail?.workspaceCount || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Zap className="h-3 w-3" /> Approvals
          </div>
          <div className="text-2xl font-semibold">{pendingApprovals.length}</div>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-3 lg:grid-cols-6">
        <Link href="/goals" className="group">
          <Card className="p-4 hover:border-accent-primary transition-colors">
            <Target className="h-5 w-5 text-fg-secondary mb-2" />
            <div className="text-sm font-medium">Goals</div>
            <div className="text-xs text-fg-muted">{companyDetail?.goalCount || 0} active</div>
          </Card>
        </Link>
        <Link href="/agents" className="group">
          <Card className="p-4 hover:border-accent-primary transition-colors">
            <Bot className="h-5 w-5 text-fg-secondary mb-2" />
            <div className="text-sm font-medium">Agents</div>
            <div className="text-xs text-fg-muted">{agents.length} enabled</div>
          </Card>
        </Link>
        <Link href="/approvals" className="group">
          <Card className="p-4 hover:border-accent-primary transition-colors">
            <Zap className="h-5 w-5 text-fg-secondary mb-2" />
            <div className="text-sm font-medium">Approvals</div>
            <div className="text-xs text-fg-muted">{pendingApprovals.length} pending</div>
          </Card>
        </Link>
        <Link href="/customers" className="group">
          <Card className="p-4 hover:border-accent-primary transition-colors">
            <Users className="h-5 w-5 text-fg-secondary mb-2" />
            <div className="text-sm font-medium">Customers</div>
            <div className="text-xs text-fg-muted">CRM pipeline</div>
          </Card>
        </Link>
        <Link href="/deals" className="group">
          <Card className="p-4 hover:border-accent-primary transition-colors">
            <ShoppingBag className="h-5 w-5 text-fg-secondary mb-2" />
            <div className="text-sm font-medium">Deals</div>
            <div className="text-xs text-fg-muted">Sales pipeline</div>
          </Card>
        </Link>
        <Link href="/products" className="group">
          <Card className="p-4 hover:border-accent-primary transition-colors">
            <Package className="h-5 w-5 text-fg-secondary mb-2" />
            <div className="text-sm font-medium">Products</div>
            <div className="text-xs text-fg-muted">Catalog</div>
          </Card>
        </Link>
        <Link href="/finance" className="group">
          <Card className="p-4 hover:border-accent-primary transition-colors">
            <DollarSign className="h-5 w-5 text-fg-secondary mb-2" />
            <div className="text-sm font-medium">Finance</div>
            <div className="text-xs text-fg-muted">Income & expenses</div>
          </Card>
        </Link>
        <Link href="/plans" className="group">
          <Card className="p-4 hover:border-accent-primary transition-colors">
            <ClipboardList className="h-5 w-5 text-fg-secondary mb-2" />
            <div className="text-sm font-medium">Plans</div>
            <div className="text-xs text-fg-muted">Execution plans</div>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Goals */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Active Goals</h2>
            <Link href="/company/goals" className="text-xs text-fg-secondary hover:text-fg">View all →</Link>
          </div>
          {goals.length === 0 ? (
            <p className="text-sm text-fg-secondary">No active goals. Define what your company is working toward.</p>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{goal.title}</span>
                    <Badge variant="default" className="text-xs">{goal.priority}</Badge>
                  </div>
                  {goal.progress > 0 && (
                    <div className="mt-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                      <div className="h-full bg-accent-primary rounded-full" style={{ width: `${Math.round(goal.progress * 100)}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Agents */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Active Agents</h2>
            <Link href="/agents" className="text-xs text-fg-secondary hover:text-fg">View all →</Link>
          </div>
          {agents.length === 0 ? (
            <p className="text-sm text-fg-secondary">No agents configured. Set up your AI workforce.</p>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{agent.name}</span>
                    <span className="text-xs text-fg-secondary ml-2">{agent.role}</span>
                  </div>
                  <Badge variant={agent.enabled ? 'success' : 'default'} className="text-xs">
                    {agent.enabled ? 'active' : 'disabled'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pending Approvals */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Pending Approvals</h2>
            <Link href="/approvals" className="text-xs text-fg-secondary hover:text-fg">View all →</Link>
          </div>
          {pendingApprovals.length === 0 ? (
            <p className="text-sm text-fg-secondary">No pending approvals.</p>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <div key={approval.id}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{approval.action}</span>
                    <Badge variant={approval.riskLevel === 'high' ? 'danger' : 'default'} className="text-xs">
                      {approval.riskLevel}
                    </Badge>
                  </div>
                  <p className="text-xs text-fg-secondary mt-0.5">{approval.description.slice(0, 80)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6 mt-6">
        <h2 className="font-semibold mb-4">Recent Activity</h2>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-fg-secondary">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs text-fg-secondary">{event.type}</span>
                <span className="text-xs text-fg-secondary">
                  {event.actorType} · {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Agent Runs + Job Stats */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        {/* Recent Agent Runs */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Agent Runs
            </h2>
            <Link href="/agents" className="text-xs text-fg-secondary hover:text-fg">View all →</Link>
          </div>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-fg-secondary">No agent runs yet. Create an agent and start a run.</p>
          ) : (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{run.agent?.name || 'Unknown'}</span>
                    <span className="text-xs text-fg-secondary ml-2">
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {run.costCredits > 0 && (
                      <span className="text-xs text-fg-muted">{run.costCredits} credits</span>
                    )}
                    {run.status === 'completed' && <Badge variant="success" className="text-xs"><CheckCircle className="h-3 w-3" /> done</Badge>}
                    {run.status === 'running' && <Badge variant="info" className="text-xs"><Clock className="h-3 w-3" /> running</Badge>}
                    {run.status === 'failed' && <Badge variant="danger" className="text-xs"><AlertCircle className="h-3 w-3" /> failed</Badge>}
                    {run.status === 'cancelled' && <Badge variant="default" className="text-xs">cancelled</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Job Stats */}
        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4" /> Execution Queue
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <Clock className="h-3 w-3" /> Pending
              </div>
              <div className="text-2xl font-semibold">{jobStatsMap['pending'] || 0}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <Activity className="h-3 w-3" /> Running
              </div>
              <div className="text-2xl font-semibold">{jobStatsMap['running'] || 0}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <CheckCircle className="h-3 w-3" /> Completed
              </div>
              <div className="text-2xl font-semibold">{jobStatsMap['completed'] || 0}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                <AlertCircle className="h-3 w-3" /> Failed
              </div>
              <div className="text-2xl font-semibold">{(jobStatsMap['failed'] || 0) + (jobStatsMap['dead_letter'] || 0)}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
