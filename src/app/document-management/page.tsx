import type { Metadata } from 'next';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Document Management — Lazynext',
  description: 'Templates, documents, e-signatures, classifications, and retention policies.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DocumentManagementService } from '@/lib/services/document-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { DocumentManagementDashboard } from './DocumentManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function DocumentManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Document Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Templates, documents, e-signatures, classifications, and retention policies.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={FileText}
            title="No workspace yet"
            description="Create a company first to start managing documents."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const [templates, documents, esignRequests, classifications, retentionPolicies, expiredDocuments, stats] = await Promise.all([
    DocumentManagementService.listTemplates(organizationId),
    DocumentManagementService.listDocuments(organizationId),
    DocumentManagementService.listESignRequests(organizationId),
    DocumentManagementService.getClassRules(organizationId),
    DocumentManagementService.getRetentionPolicies(organizationId),
    DocumentManagementService.getExpiredDocuments(organizationId),
    DocumentManagementService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Document Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Templates, documents, e-signatures, classifications, and retention policies.</p>
      </div>

      <DocumentManagementDashboard
        organizationId={organizationId}
        templates={templates}
        documents={documents}
        esignRequests={esignRequests}
        classifications={classifications}
        retentionPolicies={retentionPolicies}
        expiredDocuments={expiredDocuments}
        stats={stats}
      />
    </div>
  );
}
