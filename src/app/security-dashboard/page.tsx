import type { Metadata } from 'next';
import { Shield, Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security Dashboard — Lazynext',
  description: 'Monitor security events, resolve alerts, and migrate plaintext tokens.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SecurityService } from '@/lib/services/security';
import { Card, Button, EmptyState } from '@/components/ui';
import { SecurityDashboard } from './SecurityDashboard';
import { TenantAuditSection } from './TenantAuditSection';

export const dynamic = 'force-dynamic';

export default async function SecurityDashboardPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Security Dashboard</h1>
          <p className="text-sm text-fg-secondary mt-1">Monitor security events, resolve alerts, and migrate plaintext tokens.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Shield}
            title="No workspace yet"
            description="Create a company first to start monitoring security events."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const summary = await SecurityService.getSecuritySummary(defaultWorkspace.id);
  const recentEvents = await SecurityService.listSecurityEvents(defaultWorkspace.id, { limit: 20 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent-primary" />
            <h1 className="heading-display text-2xl">Security Dashboard</h1>
          </div>
          <p className="text-sm text-fg-secondary mt-1">
            Monitor security events, resolve alerts, and migrate plaintext tokens.
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-fg-secondary">
          <Lock className="h-3 w-3" /> {defaultWorkspace.name}
        </div>
      </div>

      <SecurityDashboard
        workspaceId={defaultWorkspace.id}
        summary={summary}
        recentEvents={recentEvents}
      />

      {/* Tenant Isolation Audit */}
      <div className="mt-6">
        <TenantAuditSection />
      </div>
    </div>
  );
}
