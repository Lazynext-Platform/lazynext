import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OnboardingService } from '@/lib/services/onboarding-service';
import { OnboardingWizard } from './OnboardingWizard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Onboarding Wizard — Lazynext',
  description: 'Set up your organization, workspace, and first resources.',
  robots: { index: false, follow: false },
};

export default async function WizardPage() {
  const session = await auth().catch(() => null);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Ensure user has at least a default workspace
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  let workspace = workspaces[0];
  if (!workspace) {
    workspace = await WorkspaceService.ensureDefaultWorkspace(session.user.id, session.user.name);
  }

  // Get onboarding state to determine starting step
  const state = await OnboardingService.getOnboardingState(session.user.id);

  // If onboarding is fully complete, redirect to dashboard
  if (state.progress === 100) {
    redirect('/dashboard');
  }

  return (
    <OnboardingWizard
      userId={session.user.id}
      userName={session.user.name || ''}
      initialOrganizationId={workspace.organizationId}
      initialWorkspaceId={workspace.id}
      initialWorkspaceName={workspace.name}
      completedStepIds={state.steps.filter((s: { id: string; completed: boolean }) => s.completed).map((s: { id: string; completed: boolean }) => s.id)}
    />
  );
}
