import type { Metadata } from 'next';
import { KeyRound } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Permission & Policy Management — Lazynext',
  description: 'Manage permission policies, roles, grants, and access checks.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PermissionService } from '@/lib/services/permission-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { PermissionDashboard } from './PermissionDashboard';

export const dynamic = 'force-dynamic';

export default async function PermissionsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Permission & Policy Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage permission policies, roles, grants, and access checks.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={KeyRound}
            title="No workspace yet"
            description="Create a company first to access permission management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [policies, roles, grants, checks, metrics, stats] = await Promise.all([
    PermissionService.listPermissionPolicies(organizationId),
    PermissionService.listPermissionRoles(organizationId),
    PermissionService.listPermissionGrants(organizationId),
    PermissionService.listPermissionChecks(organizationId),
    PermissionService.getPermissionMetrics(organizationId),
    PermissionService.getPermissionStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Permission & Policy Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage permission policies, roles, grants, and access checks.</p>
      </div>

      <PermissionDashboard
        organizationId={organizationId}
        policies={policies}
        roles={roles}
        grants={grants}
        checks={checks}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
