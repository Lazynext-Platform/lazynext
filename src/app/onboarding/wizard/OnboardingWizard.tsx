'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Building2,
  FolderKanban,
  User,
  Bot,
  Target,
  ClipboardList,
  CheckSquare,
  Database,
  Plug,
  Rocket,
  SkipForward,
} from 'lucide-react';
import { Button, Input, Textarea, Card, Badge } from '@/components/ui';

interface WizardProps {
  userId: string;
  userName: string;
  initialOrganizationId: string;
  initialWorkspaceId: string;
  initialWorkspaceName: string;
  completedStepIds: string[];
}

const WIZARD_STEPS = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles, optional: false },
  { id: 'organization', label: 'Organization', icon: Building2, optional: false },
  { id: 'workspace', label: 'Workspace', icon: FolderKanban, optional: false },
  { id: 'profile', label: 'Profile', icon: User, optional: false },
  { id: 'agents', label: 'AI Agents', icon: Bot, optional: false },
  { id: 'goal', label: 'First Goal', icon: Target, optional: false },
  { id: 'plan', label: 'First Plan', icon: ClipboardList, optional: false },
  { id: 'task', label: 'First Task', icon: CheckSquare, optional: false },
  { id: 'sample', label: 'Sample Data', icon: Database, optional: true },
  { id: 'integrations', label: 'Integrations', icon: Plug, optional: true },
  { id: 'done', label: 'Done', icon: Rocket, optional: false },
] as const;

type StepId = (typeof WIZARD_STEPS)[number]['id'];

export function OnboardingWizard({
  userId,
  userName,
  initialOrganizationId,
  initialWorkspaceId,
  initialWorkspaceName,
  completedStepIds,
}: WizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seededAgents, setSeededAgents] = useState(false);

  // Form state
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName || '');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [profileName, setProfileName] = useState(userName || '');
  const [profileRole, setProfileRole] = useState('owner');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAgentId, setTaskAgentId] = useState('');
  const [sampleSeeded, setSampleSeeded] = useState(false);

  const currentStep = WIZARD_STEPS[stepIndex];
  const progress = Math.round((stepIndex / (WIZARD_STEPS.length - 1)) * 100);

  function goNext() {
    setError('');
    if (stepIndex < WIZARD_STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  }

  function goBack() {
    setError('');
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  }

  function skip() {
    setError('');
    goNext();
  }

  async function apiCall(url: string, method: string = 'POST', body?: unknown) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed');
      }
      return await res.json().catch(() => ({}));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ── Step handlers ──

  async function handleOrganization() {
    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }
    await apiCall('/api/organizations', 'POST', {
      name: orgName.trim(),
      description: orgDescription.trim() || undefined,
    });
    goNext();
  }

  async function handleWorkspace() {
    if (!workspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }
    await apiCall('/api/workspaces', 'POST', {
      name: workspaceName.trim(),
      description: workspaceDescription.trim() || undefined,
      organizationId: initialOrganizationId,
    });
    goNext();
  }

  async function handleProfile() {
    if (!profileName.trim()) {
      setError('Your name is required');
      return;
    }
    await apiCall('/api/profile', 'PATCH', {
      name: profileName.trim(),
      role: profileRole,
    });
    goNext();
  }

  async function handleSeedAgents() {
    await apiCall('/api/agents/seed', 'POST', {
      workspaceId: initialWorkspaceId,
      organizationId: initialOrganizationId,
    });
    setSeededAgents(true);
    goNext();
  }

  async function handleCreateGoal() {
    if (!goalTitle.trim()) {
      setError('Goal title is required');
      return;
    }
    await apiCall('/api/goals', 'POST', {
      organizationId: initialOrganizationId,
      workspaceId: initialWorkspaceId,
      title: goalTitle.trim(),
      description: goalDescription.trim() || undefined,
      dueDate: goalTargetDate || undefined,
    });
    goNext();
  }

  async function handleCreatePlan() {
    if (!planTitle.trim()) {
      setError('Plan title is required');
      return;
    }
    await apiCall('/api/plans', 'POST', {
      workspaceId: initialWorkspaceId,
      organizationId: initialOrganizationId,
      title: planTitle.trim(),
      objective: planDescription.trim() || planTitle.trim(),
    });
    goNext();
  }

  async function handleCreateTask() {
    if (!taskTitle.trim()) {
      setError('Task title is required');
      return;
    }
    await apiCall('/api/tasks', 'POST', {
      workspaceId: initialWorkspaceId,
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      assignedAgentId: taskAgentId.trim() || undefined,
    });
    goNext();
  }

  async function handleSeedSample() {
    await apiCall('/api/onboarding/seed-sample', 'POST', {
      organizationId: initialOrganizationId,
      workspaceId: initialWorkspaceId,
    });
    setSampleSeeded(true);
    goNext();
  }

  async function handleComplete() {
    // Mark optional steps as completed via the API
    for (const stepId of ['explore_dashboard', 'connect_integrations', 'review_security']) {
      try {
        await apiCall('/api/onboarding/complete-step', 'POST', { stepId });
      } catch {
        // best effort
      }
    }
    router.push('/dashboard');
    router.refresh();
  }

  // ── Render ──

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span
            className="flex h-12 w-12 items-center justify-center border-2 text-xl font-black"
            style={{
              borderColor: 'var(--c-ink)',
              backgroundColor: 'var(--c-accent)',
              color: 'var(--c-accent-fg)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-hard)',
            }}
          >
            L
          </span>
          <span className="heading-display text-2xl">Lazynext</span>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">
              Step {stepIndex + 1} of {WIZARD_STEPS.length}
            </span>
            <span className="text-sm text-fg-secondary">{progress}% complete</span>
          </div>
          <div className="h-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-surface)' }}>
            <div
              className="h-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: 'var(--c-accent)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {WIZARD_STEPS.map((s, i) => {
            const Icon = s.icon;
            const isCompleted = completedStepIds.includes(s.id) || i < stepIndex;
            const isCurrent = i === stepIndex;
            return (
              <div
                key={s.id}
                className="flex items-center gap-1 shrink-0"
                style={{ opacity: isCurrent || isCompleted ? 1 : 0.5 }}
              >
                <div
                  className="flex h-7 w-7 items-center justify-center border-2"
                  style={{
                    borderColor: 'var(--c-ink)',
                    backgroundColor: isCompleted ? 'var(--c-success)' : isCurrent ? 'var(--c-accent)' : 'var(--c-surface)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" style={{ color: 'var(--c-surface)' }} strokeWidth={3} />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                {i < WIZARD_STEPS.length - 1 && (
                  <div className="w-4 h-[2px]" style={{ backgroundColor: 'var(--c-ink)' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <Card className="p-8" style={{ boxShadow: 'var(--shadow-hard-lg)' }}>
          {/* Step 1: Welcome */}
          {currentStep.id === 'welcome' && (
            <div className="text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--c-accent)' }} />
              <h1 className="heading-display text-xl mb-2">Welcome to Lazynext!</h1>
              <p className="text-sm text-fg-secondary mb-6">
                Let&apos;s set up your organization and workspace in a few quick steps.
                You&apos;ll be ready to work in under 5 minutes.
              </p>
              <Button onClick={goNext} className="w-full">
                Get started <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Organization */}
          {currentStep.id === 'organization' && (
            <StepLayout
              icon={Building2}
              title="Create your organization"
              subtitle="Your organization is the top-level entity that owns your workspaces."
            >
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Inc."
                autoFocus
                className="mb-3"
              />
              <Textarea
                value={orgDescription}
                onChange={(e) => setOrgDescription(e.target.value)}
                placeholder="What does your organization do? (optional)"
                rows={2}
                className="mb-4"
              />
              {error && <p className="text-sm text-danger mb-3">{error}</p>}
              <NavButtons onNext={handleOrganization} onSkip={undefined} loading={loading} nextLabel="Create & continue" />
            </StepLayout>
          )}

          {/* Step 3: Workspace */}
          {currentStep.id === 'workspace' && (
            <StepLayout
              icon={FolderKanban}
              title="Create your workspace"
              subtitle="Workspaces are where your team collaborates on projects and tasks."
            >
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. Marketing Team"
                autoFocus
                className="mb-3"
              />
              <Textarea
                value={workspaceDescription}
                onChange={(e) => setWorkspaceDescription(e.target.value)}
                placeholder="What is this workspace for? (optional)"
                rows={2}
                className="mb-4"
              />
              {error && <p className="text-sm text-danger mb-3">{error}</p>}
              <NavButtons onNext={handleWorkspace} onBack={goBack} loading={loading} nextLabel="Create & continue" />
            </StepLayout>
          )}

          {/* Step 4: Profile */}
          {currentStep.id === 'profile' && (
            <StepLayout
              icon={User}
              title="Set up your profile"
              subtitle="Tell us a bit about yourself so we can personalize your experience."
            >
              <label className="text-xs font-semibold mb-1 block">Your name</label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Jane Doe"
                autoFocus
                className="mb-3"
              />
              <label className="text-xs font-semibold mb-1 block">Your role</label>
              <select
                value={profileRole}
                onChange={(e) => setProfileRole(e.target.value)}
                className="w-full mb-4 border-2 bg-surface px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              {error && <p className="text-sm text-danger mb-3">{error}</p>}
              <NavButtons onNext={handleProfile} onBack={goBack} loading={loading} nextLabel="Save & continue" />
            </StepLayout>
          )}

          {/* Step 5: Seed Agents */}
          {currentStep.id === 'agents' && (
            <StepLayout
              icon={Bot}
              title="Seed default AI agents"
              subtitle="We&apos;ll create 6 default AI agents to help you with growth, design, engineering, research, product, and operations."
            >
              <div className="mb-4 space-y-2">
                {['Growth Manager', 'Design Lead', 'Engineering Lead', 'Research Analyst', 'Product Manager', 'Operations Manager'].map((name) => (
                  <div key={name} className="flex items-center gap-2 p-2 border-2 bg-surface" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                    <Bot className="h-4 w-4 text-fg-muted" />
                    <span className="text-sm">{name}</span>
                    {seededAgents && <Check className="h-4 w-4 ml-auto" style={{ color: 'var(--c-success)' }} />}
                  </div>
                ))}
              </div>
              {error && <p className="text-sm text-danger mb-3">{error}</p>}
              <NavButtons
                onNext={seededAgents ? goNext : handleSeedAgents}
                onBack={goBack}
                onSkip={skip}
                loading={loading}
                nextLabel={seededAgents ? 'Continue' : 'Seed agents'}
              />
            </StepLayout>
          )}

          {/* Step 6: Goal */}
          {currentStep.id === 'goal' && (
            <StepLayout
              icon={Target}
              title="Create your first goal"
              subtitle="Goals define what your organization wants to achieve."
            >
              <Input
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="e.g. Increase brand awareness by 30%"
                autoFocus
                className="mb-3"
              />
              <Textarea
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                placeholder="Describe your goal (optional)"
                rows={2}
                className="mb-3"
              />
              <label className="text-xs font-semibold mb-1 block">Target date (optional)</label>
              <Input
                type="date"
                value={goalTargetDate}
                onChange={(e) => setGoalTargetDate(e.target.value)}
                className="mb-4"
              />
              {error && <p className="text-sm text-danger mb-3">{error}</p>}
              <NavButtons onNext={handleCreateGoal} onBack={goBack} onSkip={skip} loading={loading} nextLabel="Create goal" />
            </StepLayout>
          )}

          {/* Step 7: Plan */}
          {currentStep.id === 'plan' && (
            <StepLayout
              icon={ClipboardList}
              title="Create your first plan"
              subtitle="Plans break down goals into actionable objectives."
            >
              <Input
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                placeholder="e.g. Q1 Marketing Campaign Plan"
                autoFocus
                className="mb-3"
              />
              <Textarea
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                placeholder="What is the objective of this plan?"
                rows={3}
                className="mb-4"
              />
              {error && <p className="text-sm text-danger mb-3">{error}</p>}
              <NavButtons onNext={handleCreatePlan} onBack={goBack} onSkip={skip} loading={loading} nextLabel="Create plan" />
            </StepLayout>
          )}

          {/* Step 8: Task */}
          {currentStep.id === 'task' && (
            <StepLayout
              icon={CheckSquare}
              title="Create your first task"
              subtitle="Tasks track the individual pieces of work needed to execute plans."
            >
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Define target audience personas"
                autoFocus
                className="mb-3"
              />
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Describe the task (optional)"
                rows={2}
                className="mb-3"
              />
              <label className="text-xs font-semibold mb-1 block">Assign to agent (optional)</label>
              <Input
                value={taskAgentId}
                onChange={(e) => setTaskAgentId(e.target.value)}
                placeholder="Agent ID"
                className="mb-4"
              />
              {error && <p className="text-sm text-danger mb-3">{error}</p>}
              <NavButtons onNext={handleCreateTask} onBack={goBack} onSkip={skip} loading={loading} nextLabel="Create task" />
            </StepLayout>
          )}

          {/* Step 9: Sample Data */}
          {currentStep.id === 'sample' && (
            <StepLayout
              icon={Database}
              title="Seed sample data (optional)"
              subtitle="We&apos;ll create sample goals, plans, tasks, customers, deals, and memories so you can explore the platform."
              optional
            >
              {sampleSeeded ? (
                <div className="mb-4 p-4 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-success)' }}>
                  <p className="text-sm flex items-center gap-2">
                    <Check className="h-4 w-4" /> Sample data seeded successfully!
                  </p>
                </div>
              ) : (
                <div className="mb-4 p-4 border-2 bg-surface-alt" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                  <p className="text-sm text-fg-secondary">
                    This will create: 3 goals, 2 plans, 8 tasks, 5 customers, 2 deals, 6 agents, and 3 memories.
                  </p>
                </div>
              )}
              {error && <p className="text-sm text-danger mb-3">{error}</p>}
              <NavButtons
                onNext={sampleSeeded ? goNext : handleSeedSample}
                onBack={goBack}
                onSkip={skip}
                loading={loading}
                nextLabel={sampleSeeded ? 'Continue' : 'Seed sample data'}
              />
            </StepLayout>
          )}

          {/* Step 10: Integrations */}
          {currentStep.id === 'integrations' && (
            <StepLayout
              icon={Plug}
              title="Connect integrations (optional)"
              subtitle="Connect your ad platforms, analytics, and other tools to get the most out of Lazynext."
              optional
            >
              <div className="mb-4 space-y-2">
                <IntegrationLink href="/integrations" label="Ad Platforms (Meta, Google Ads)" />
                <IntegrationLink href="/settings/billing" label="Billing & Payments" />
                <IntegrationLink href="/settings/security" label="Security & API Keys" />
              </div>
              {error && <p className="text-sm text-danger mb-3">{error}</p>}
              <NavButtons onNext={goNext} onBack={goBack} onSkip={skip} loading={loading} nextLabel="Continue" />
            </StepLayout>
          )}

          {/* Step 11: Done */}
          {currentStep.id === 'done' && (
            <div className="text-center">
              <div
                className="flex h-16 w-16 mx-auto items-center justify-center border-2 mb-4"
                style={{
                  borderColor: 'var(--c-ink)',
                  backgroundColor: 'var(--c-success)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-hard)',
                }}
              >
                <Rocket className="h-8 w-8" style={{ color: 'var(--c-surface)' }} />
              </div>
              <h1 className="heading-display text-xl mb-2">You&apos;re all set!</h1>
              <p className="text-sm text-fg-secondary mb-6">
                Your organization is ready. Click below to go to your dashboard and start working.
              </p>
              <Button onClick={handleComplete} disabled={loading} className="w-full">
                Go to dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Helper components ──

function StepLayout({
  icon: Icon,
  title,
  subtitle,
  optional,
  children,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  subtitle: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex h-10 w-10 items-center justify-center border-2"
          style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="heading-display text-lg">{title}</h1>
          <p className="text-xs text-fg-secondary">{subtitle}</p>
        </div>
        {optional && <Badge variant="default" className="ml-auto">Optional</Badge>}
      </div>
      {children}
    </div>
  );
}

function NavButtons({
  onNext,
  onBack,
  onSkip,
  loading,
  nextLabel,
}: {
  onNext: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  loading: boolean;
  nextLabel: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {onBack && (
        <Button onClick={onBack} variant="ghost" disabled={loading}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      )}
      <Button onClick={onNext} disabled={loading} className="flex-1">
        {loading ? 'Working...' : nextLabel} <ArrowRight className="h-4 w-4" />
      </Button>
      {onSkip && (
        <Button onClick={onSkip} variant="ghost" disabled={loading}>
          <SkipForward className="h-4 w-4" /> Skip
        </Button>
      )}
    </div>
  );
}

function IntegrationLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between p-3 border-2 bg-surface hover:bg-hover transition-colors"
      style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
    >
      <span className="text-sm font-medium">{label}</span>
      <ArrowRight className="h-4 w-4 text-fg-muted" />
    </a>
  );
}
