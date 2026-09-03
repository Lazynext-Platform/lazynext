import Link from 'next/link';
import type { Metadata } from 'next';
import { FolderKanban, CheckSquare, FileText, Sparkles, Zap, Bot, Plug, BarChart3, ArrowRight, Activity, TrendingUp, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard — Lazynext',
  description: 'Overview of your workspace, projects, tasks, and activity.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { getCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth().catch(() => null);

  if (!session?.user?.id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="text-center">
          <h1 className="heading-display text-2xl mb-4">Welcome to Lazynext</h1>
          <p className="text-fg-secondary mb-6">Sign in to access your workspace.</p>
          <Button href="/login">Sign in</Button>
        </div>
      </div>
    );
  }

  const userId = session.user.id;

  // Ensure user has a workspace
  const workspaces = await WorkspaceService.listForUser(userId);
  let workspace = workspaces[0];
  if (!workspace) {
    workspace = await WorkspaceService.ensureDefaultWorkspace(userId, session.user.name);
  }

  // Fetch dashboard data in parallel
  const [projects, tasks, documents, automations, agents, recentCreations] = await Promise.all([
    safePrisma(() => prisma.project.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, status: 'active' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }), []),
    safePrisma(() => prisma.task.findMany({
      where: { project: { workspaceId: workspace.id }, deletedAt: null, status: { in: ['todo', 'in_progress'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }), []),
    safePrisma(() => prisma.document.findMany({
      where: { workspaceId: workspace.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }), []),
    safePrisma(() => prisma.automation.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }), []),
    safePrisma(() => prisma.agentDef.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }), []),
    safePrisma(() => prisma.creation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }), []),
  ]);

  const stats = {
    projects: await safePrisma(() => prisma.project.count({ where: { workspaceId: workspace.id, deletedAt: null } }), 0),
    tasks: await safePrisma(() => prisma.task.count({ where: { project: { workspaceId: workspace.id }, deletedAt: null } }), 0),
    documents: await safePrisma(() => prisma.document.count({ where: { workspaceId: workspace.id, deletedAt: null } }), 0),
    automations: await safePrisma(() => prisma.automation.count({ where: { workspaceId: workspace.id } }), 0),
  };

  // Task progress + activity feed + credits
  const [completedTasks, totalTasks, recentActivity, credits, planTier] = await Promise.all([
    safePrisma(() => prisma.task.count({ where: { project: { workspaceId: workspace.id }, deletedAt: null, status: 'done' } }), 0),
    safePrisma(() => prisma.task.count({ where: { project: { workspaceId: workspace.id }, deletedAt: null } }), 0),
    safePrisma(() => prisma.auditEvent.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }), []),
    getCredits(userId).catch(() => 0),
    getUserPlanTier(userId).catch(() => 'free' as const),
  ]);

  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const quickActions = [
    { href: '/projects', label: 'New Project', icon: FolderKanban, desc: 'Organize work' },
    { href: '/tasks', label: 'New Task', icon: CheckSquare, desc: 'Track progress' },
    { href: '/documents', label: 'New Document', icon: FileText, desc: 'Write knowledge' },
    { href: '/creative', label: 'Creative Studio', icon: Sparkles, desc: 'Generate ads' },
    { href: '/automations', label: 'New Automation', icon: Zap, desc: 'Automate work' },
    { href: '/agents', label: 'New AI Agent', icon: Bot, desc: 'Delegate to AI' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span
            className="flex h-10 w-10 items-center justify-center border-2 font-display text-lg font-black"
            style={{
              borderColor: 'var(--c-ink)',
              backgroundColor: 'var(--c-accent)',
              color: 'var(--c-accent-fg)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-hard-sm)',
            }}
          >
            {workspace.name[0]?.toUpperCase()}
          </span>
          <div>
            <h1 className="heading-display text-2xl">{workspace.name}</h1>
            <p className="text-sm text-fg-secondary">
              {session.user.name || session.user.email} · <span className="label-mono">{workspace.role}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <StatCard label="Projects" value={stats.projects} href="/projects" icon={FolderKanban} />
        <StatCard label="Tasks" value={stats.tasks} href="/tasks" icon={CheckSquare} />
        <StatCard label="Documents" value={stats.documents} href="/documents" icon={FileText} />
        <StatCard label="Automations" value={stats.automations} href="/automations" icon={Zap} />
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="heading-display text-sm mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col gap-2 p-4 border-2 bg-surface transition-all hover:translate-x-[2px] hover:translate-y-[2px]"
              style={{
                borderColor: 'var(--c-ink)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-hard-sm)',
              }}
            >
              <action.icon className="h-6 w-6" style={{ color: 'var(--c-fg)' }} />
              <div>
                <p className="text-sm font-semibold">{action.label}</p>
                <p className="text-xs text-fg-muted">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent projects */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-display text-sm">Recent Projects</h2>
            <Link href="/projects" className="text-xs text-fg-secondary hover:text-fg flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create your first project to organize tasks, documents, and files."
              action={<Button href="/projects" size="sm">Create project</Button>}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between p-3 border-2 bg-surface hover:bg-hover transition-colors"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FolderKanban className="h-4 w-4 shrink-0 text-fg-muted" />
                    <span className="text-sm font-medium truncate">{p.name}</span>
                  </div>
                  <Badge>{p.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Recent tasks */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-display text-sm">Open Tasks</h2>
            <Link href="/tasks" className="text-xs text-fg-secondary hover:text-fg flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {tasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No open tasks"
              description="Create tasks within your projects to track work."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border-2 bg-surface"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckSquare className="h-4 w-4 shrink-0 text-fg-muted" />
                    <span className="text-sm font-medium truncate">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge>{task.priority}</Badge>
                    <Badge>{task.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent documents */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-display text-sm">Recent Documents</h2>
            <Link href="/documents" className="text-xs text-fg-secondary hover:text-fg flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              description="Create documents to build your knowledge base."
              action={<Button href="/documents" size="sm">New document</Button>}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center justify-between p-3 border-2 bg-surface hover:bg-hover transition-colors"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-fg-muted" />
                    <span className="text-sm font-medium truncate">{doc.title}</span>
                  </div>
                  <span className="text-xs text-fg-muted shrink-0">
                    v{doc.version}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Recent creative activity */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-display text-sm">Recent Creative</h2>
            <Link href="/creative" className="text-xs text-fg-secondary hover:text-fg flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentCreations.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No creative work yet"
              description="Use Creative Studio to generate ads, scripts, and more."
              action={<Button href="/creative" size="sm">Open Creative Studio</Button>}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {recentCreations.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 border-2 bg-surface"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Sparkles className="h-4 w-4 shrink-0 text-fg-muted" />
                    <span className="text-sm font-medium truncate">{c.templateId}</span>
                  </div>
                  <Badge>{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Automations + Agents row */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-display text-sm">Automations</h2>
            <Link href="/automations" className="text-xs text-fg-secondary hover:text-fg flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {automations.length === 0 ? (
            <EmptyState icon={Zap} title="No automations" description="Automate repetitive workflows." />
          ) : (
            <div className="flex flex-col gap-2">
              {automations.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 border-2 bg-surface" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Zap className="h-4 w-4 shrink-0 text-fg-muted" />
                    <span className="text-sm font-medium truncate">{a.name}</span>
                  </div>
                  <Badge variant={a.enabled ? 'success' : 'default'}>{a.enabled ? 'ON' : 'OFF'}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-display text-sm">AI Agents</h2>
            <Link href="/agents" className="text-xs text-fg-secondary hover:text-fg flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {agents.length === 0 ? (
            <EmptyState icon={Bot} title="No agents" description="Create AI agents to delegate work." />
          ) : (
            <div className="flex flex-col gap-2">
              {agents.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 border-2 bg-surface" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Bot className="h-4 w-4 shrink-0 text-fg-muted" />
                    <span className="text-sm font-medium truncate">{a.name}</span>
                  </div>
                  <Badge>{a.modelProvider}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Task progress + Activity feed row */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        {/* Task progress */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-display text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Task Progress
            </h2>
            <Link href="/tasks" className="text-xs text-fg-secondary hover:text-fg flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="heading-display text-3xl">{taskProgress}%</p>
                <p className="text-xs text-fg-muted">{completedTasks} of {totalTasks} tasks completed</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="success">{completedTasks} done</Badge>
                <Badge>{totalTasks - completedTasks} open</Badge>
              </div>
            </div>
            <div className="h-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-surface)' }}>
              <div
                className="h-full transition-all"
                style={{ width: `${taskProgress}%`, backgroundColor: taskProgress === 100 ? 'var(--c-success)' : 'var(--c-accent)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-display text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Activity
            </h2>
          </div>
          {recentActivity.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" description="Actions across your workspace will appear here." />
          ) : (
            <div className="flex flex-col gap-2">
              {recentActivity.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-2 text-sm">
                  <div className="flex h-6 w-6 items-center justify-center border-2 shrink-0" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-surface-alt)' }}>
                    <Clock className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs truncate">{e.action}</p>
                    <p className="text-xs text-fg-muted">{new Date(e.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Credits + Plan footer */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="heading-display text-sm mb-1">Credits</h2>
              <p className="heading-display text-2xl">{credits}</p>
              <p className="text-xs text-fg-muted">remaining balance</p>
            </div>
            <Button href="/settings/billing" size="sm">Buy more <ArrowRight className="h-3 w-3" /></Button>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="heading-display text-sm mb-1">Plan</h2>
              <p className="heading-display text-2xl capitalize">{planTier}</p>
              <p className="text-xs text-fg-muted">current tier</p>
            </div>
            <Button href="/settings/billing" size="sm">Upgrade <ArrowRight className="h-3 w-3" /></Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, href, icon: Icon }: { label: string; value: number; href: string; icon: typeof FolderKanban }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 p-4 border-2 bg-surface transition-all hover:translate-x-[2px] hover:translate-y-[2px]"
      style={{
        borderColor: 'var(--c-ink)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-hard-sm)',
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center border-2"
        style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="heading-display text-xl">{value}</p>
        <p className="label-mono">{label}</p>
      </div>
    </Link>
  );
}
