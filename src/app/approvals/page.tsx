import type { Metadata } from 'next';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Approvals — Lazynext',
  description: 'Review and decide on pending approval requests across your workspaces.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { safePrisma } from '@/lib/safe-prisma';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { ApprovalsClient } from './ApprovalsClient';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
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
          <h1 className="heading-display text-2xl">Approvals</h1>
          <p className="text-sm text-fg-secondary mt-1">Review and decide on pending approval requests.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Clock}
            title="No workspaces yet"
            description="Create a workspace to start receiving approval requests from your agents."
            action={<Button href="/dashboard">Go to Dashboard</Button>}
          />
        </Card>
      </div>
    );
  }

  const [pendingApprovals, recentApprovals] = await Promise.all([
    safePrisma(() => prisma.approval.findMany({
      where: { workspaceId: { in: workspaceIds }, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }), []),
    safePrisma(() => prisma.approval.findMany({
      where: { workspaceId: { in: workspaceIds }, status: { in: ['approved', 'rejected', 'expired', 'cancelled'] } },
      orderBy: { decidedAt: 'desc', updatedAt: 'desc' },
      take: 20,
    }), []),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Approvals</h1>
        <p className="text-sm text-fg-secondary mt-1">Review and decide on pending approval requests across your workspaces.</p>
      </div>

      {/* Pending Approvals */}
      <div className="mb-8">
        <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Pending Approvals
          {pendingApprovals.length > 0 && (
            <Badge variant="warning">{pendingApprovals.length}</Badge>
          )}
        </h2>
        {pendingApprovals.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={CheckCircle}
              title="No pending approvals"
              description="All clear — there are no approval requests waiting for your decision."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((approval) => (
              <Card key={approval.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{approval.action}</span>
                      <Badge variant={approval.riskLevel === 'high' ? 'danger' : approval.riskLevel === 'medium' ? 'warning' : 'default'} className="text-xs">
                        {approval.riskLevel} risk
                      </Badge>
                      {approval.estimatedCost > 0 && (
                        <Badge variant="info" className="text-xs">{approval.estimatedCost} credits</Badge>
                      )}
                    </div>
                    <p className="text-sm text-fg-secondary">{approval.description}</p>
                    <p className="text-xs text-fg-muted mt-2">
                      Requested {new Date(approval.createdAt).toLocaleString()}
                      {approval.expiresAt && (
                        <> · Expires {new Date(approval.expiresAt).toLocaleString()}</>
                      )}
                    </p>
                  </div>
                  <ApprovalsClient approvalId={approval.id} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Decisions */}
      <div>
        <h2 className="heading-display text-sm mb-4">Recent Decisions</h2>
        {recentApprovals.length === 0 ? (
          <Card className="p-6">
            <p className="text-sm text-fg-secondary">No recent decisions.</p>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="space-y-3">
              {recentApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    {approval.status === 'approved' ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                    ) : approval.status === 'rejected' ? (
                      <XCircle className="h-4 w-4 shrink-0 text-danger" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0 text-fg-muted" />
                    )}
                    <span className="font-medium truncate">{approval.action}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={approval.status === 'approved' ? 'success' : approval.status === 'rejected' ? 'danger' : 'default'}
                      className="text-xs"
                    >
                      {approval.status}
                    </Badge>
                    <span className="text-xs text-fg-muted">
                      {approval.decidedAt ? new Date(approval.decidedAt).toLocaleString() : new Date(approval.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
