import type { Metadata } from 'next';
import { ClipboardList, Plus, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Plans — Lazynext',
  description: 'View and manage company plans with status, priority, and risk levels.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { safePrisma } from '@/lib/safe-prisma';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { NewPlanForm } from './NewPlanForm';

export const dynamic = 'force-dynamic';

const priorityVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const riskVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  high: 'danger',
  medium: 'warning',
  low: 'success',
};

export default async function PlansPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const workspaceIds = workspaces.map((w) => w.id);

  if (workspaceIds.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Plans</h1>
          <p className="text-sm text-fg-secondary mt-1">View and manage company plans with status, priority, and risk levels.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={ClipboardList}
            title="No workspaces yet"
            description="Create a workspace to start building plans."
            action={<Button href="/dashboard">Go to Dashboard</Button>}
          />
        </Card>
      </div>
    );
  }

  const plans = await safePrisma(() => prisma.plan.findMany({
    where: { workspaceId: { in: workspaceIds } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  }), []);

  const activePlans = plans.filter((p) => p.status === 'active');
  const draftPlans = plans.filter((p) => p.status === 'draft');
  const completedPlans = plans.filter((p) => p.status === 'completed');
  const otherPlans = plans.filter((p) => p.status !== 'active' && p.status !== 'draft' && p.status !== 'completed');

  const defaultWorkspace = workspaces[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl">Plans</h1>
          <p className="text-sm text-fg-secondary mt-1">View and manage company plans with status, priority, and risk levels.</p>
        </div>
        <NewPlanForm
          workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, organizationId: w.organizationId }))}
          defaultWorkspaceId={defaultWorkspace.id}
          defaultOrganizationId={defaultWorkspace.organizationId}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <ClipboardList className="h-3 w-3" /> Total
          </div>
          <div className="text-2xl font-semibold">{plans.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Zap className="h-3 w-3" /> Active
          </div>
          <div className="text-2xl font-semibold">{activePlans.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <ClipboardList className="h-3 w-3" /> Draft
          </div>
          <div className="text-2xl font-semibold">{draftPlans.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <ClipboardList className="h-3 w-3" /> Completed
          </div>
          <div className="text-2xl font-semibold">{completedPlans.length}</div>
        </Card>
      </div>

      {/* Active Plans */}
      <div className="mb-8">
        <h2 className="heading-display text-sm mb-4">Active Plans</h2>
        {activePlans.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={ClipboardList}
              title="No active plans"
              description="Create a plan to define objectives and tasks for your agents to execute."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {activePlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} priorityVariant={priorityVariant} riskVariant={riskVariant} />
            ))}
          </div>
        )}
      </div>

      {/* Draft Plans */}
      {draftPlans.length > 0 && (
        <div className="mb-8">
          <h2 className="heading-display text-sm mb-4">Draft Plans</h2>
          <div className="space-y-3">
            {draftPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} priorityVariant={priorityVariant} riskVariant={riskVariant} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Plans */}
      {completedPlans.length > 0 && (
        <div className="mb-8">
          <h2 className="heading-display text-sm mb-4">Completed Plans</h2>
          <div className="space-y-3">
            {completedPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} priorityVariant={priorityVariant} riskVariant={riskVariant} />
            ))}
          </div>
        </div>
      )}

      {/* Other Plans */}
      {otherPlans.length > 0 && (
        <div>
          <h2 className="heading-display text-sm mb-4">Other Plans</h2>
          <div className="space-y-3">
            {otherPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} priorityVariant={priorityVariant} riskVariant={riskVariant} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  priorityVariant,
  riskVariant,
}: {
  plan: {
    id: string;
    title: string;
    objective: string;
    status: string;
    priority: string;
    riskLevel: string;
    estimatedCost: number;
    createdAt: Date;
  };
  priorityVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'>;
  riskVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'>;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold">{plan.title}</span>
            <Badge variant="default" className="text-xs">{plan.status}</Badge>
            <Badge variant={priorityVariant[plan.priority] || 'default'} className="text-xs">
              {plan.priority}
            </Badge>
            <Badge variant={riskVariant[plan.riskLevel] || 'default'} className="text-xs">
              {plan.riskLevel} risk
            </Badge>
            {plan.estimatedCost > 0 && (
              <Badge variant="info" className="text-xs">{plan.estimatedCost} credits</Badge>
            )}
          </div>
          <p className="text-sm text-fg-secondary">{plan.objective}</p>
          <p className="text-xs text-fg-muted mt-2">Created {new Date(plan.createdAt).toLocaleString()}</p>
        </div>
      </div>
    </Card>
  );
}
