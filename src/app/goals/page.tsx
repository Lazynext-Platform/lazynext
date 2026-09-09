import type { Metadata } from 'next';
import { Target, Plus, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Goals — Lazynext',
  description: 'Track company goals, progress, and priorities.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { CompanyService } from '@/lib/services/company';
import { GoalService } from '@/lib/services/goal';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { NewGoalForm } from './NewGoalForm';
import { PlanFromGoalButton } from './PlanFromGoalButton';

export const dynamic = 'force-dynamic';

const priorityVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

export default async function GoalsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const companies = await CompanyService.listForUser(session.user.id);

  if (companies.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Goals</h1>
          <p className="text-sm text-fg-secondary mt-1">Track company goals, progress, and priorities.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Target}
            title="No company yet"
            description="Create a company first, then define goals for it."
            action={<Button href="/company/new"><Plus className="h-4 w-4" /> Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  // Fetch goals for all companies in parallel
  const goalsByCompany = await Promise.all(
    companies.map(async (company) => ({
      company,
      goals: await GoalService.list(company.id),
    })),
  );

  const allGoals = goalsByCompany.flatMap((g) => g.goals);
  const activeGoals = allGoals.filter((g) => g.status === 'active');
  const completedGoals = allGoals.filter((g) => g.status === 'completed');
  const otherGoals = allGoals.filter((g) => g.status !== 'active' && g.status !== 'completed');

  const defaultCompany = companies[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl">Goals</h1>
          <p className="text-sm text-fg-secondary mt-1">Track company goals, progress, and priorities.</p>
        </div>
        <NewGoalForm
          companies={companies.map((c) => ({ id: c.id, name: c.name }))}
          defaultCompanyId={defaultCompany.id}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Target className="h-3 w-3" /> Total
          </div>
          <div className="text-2xl font-semibold">{allGoals.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <TrendingUp className="h-3 w-3" /> Active
          </div>
          <div className="text-2xl font-semibold">{activeGoals.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Target className="h-3 w-3" /> Completed
          </div>
          <div className="text-2xl font-semibold">{completedGoals.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Target className="h-3 w-3" /> Other
          </div>
          <div className="text-2xl font-semibold">{otherGoals.length}</div>
        </Card>
      </div>

      {/* Active Goals */}
      <div className="mb-8">
        <h2 className="heading-display text-sm mb-4">Active Goals</h2>
        {activeGoals.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={Target}
              title="No active goals"
              description="Define what your company is working toward. Create your first goal to get started."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {activeGoals.map((goal) => (
              <Card key={goal.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{goal.title}</span>
                      <Badge variant={priorityVariant[goal.priority] || 'default'} className="text-xs">
                        {goal.priority}
                      </Badge>
                      <Badge variant="default" className="text-xs">{goal.type}</Badge>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-fg-secondary">{goal.description}</p>
                    )}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-fg-muted">Progress</span>
                        <span className="text-xs font-medium">{Math.round(goal.progress * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                        <div
                          className="h-full bg-accent-primary rounded-full transition-all"
                          style={{ width: `${Math.round(goal.progress * 100)}%` }}
                        />
                      </div>
                    </div>
                    {goal.dueDate && (
                      <p className="text-xs text-fg-muted mt-2">Due {new Date(goal.dueDate).toLocaleDateString()}</p>
                    )}
                  </div>
                  <PlanFromGoalButton goalId={goal.id} goalTitle={goal.title} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="mb-8">
          <h2 className="heading-display text-sm mb-4">Completed Goals</h2>
          <div className="space-y-3">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{goal.title}</span>
                      <Badge variant="success" className="text-xs">completed</Badge>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-fg-secondary">{goal.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-fg-muted shrink-0">
                    {Math.round(goal.progress * 100)}%
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Other Goals */}
      {otherGoals.length > 0 && (
        <div>
          <h2 className="heading-display text-sm mb-4">Other Goals</h2>
          <div className="space-y-3">
            {otherGoals.map((goal) => (
              <Card key={goal.id} className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{goal.title}</span>
                      <Badge variant="default" className="text-xs">{goal.status}</Badge>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-fg-secondary">{goal.description}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
