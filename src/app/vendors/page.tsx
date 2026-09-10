import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Vendor Management — Lazynext',
  description: 'Manage vendors, contracts, performance, spend, and compliance.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorService } from '@/lib/services/vendor-service';
import { VendorContractService } from '@/lib/services/vendor-contract-service';
import { VendorPerformanceService } from '@/lib/services/vendor-performance-service';
import { VendorSpendService } from '@/lib/services/vendor-spend-service';
import { VendorComplianceService } from '@/lib/services/vendor-compliance-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { VendorDashboard } from './VendorDashboard';

export const dynamic = 'force-dynamic';

export default async function VendorsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Vendor Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage vendors, contracts, performance, spend, and compliance.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Building2}
            title="No workspace yet"
            description="Create a company first to access vendor management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [vendors, vendorStats, contracts, contractStats, expiringContracts, renewalAlerts, performanceReviews, performanceStats, topPerformers, spendStats, complianceRecords, complianceStats, nonCompliant, expiringCompliance] = await Promise.all([
    VendorService.list(organizationId),
    VendorService.getStats(organizationId),
    VendorContractService.list(organizationId),
    VendorContractService.getStats(organizationId),
    VendorContractService.getExpiring(organizationId, 30),
    VendorContractService.getRenewalAlerts(organizationId),
    VendorPerformanceService.list(organizationId),
    VendorPerformanceService.getStats(organizationId),
    VendorPerformanceService.getTopPerformers(organizationId, 10),
    VendorSpendService.getStats(organizationId),
    VendorComplianceService.list(organizationId),
    VendorComplianceService.getStats(organizationId),
    VendorComplianceService.getNonCompliant(organizationId),
    VendorComplianceService.getExpiring(organizationId, 30),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Vendor Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage vendors, contracts, performance, spend, and compliance.</p>
      </div>

      <VendorDashboard
        organizationId={organizationId}
        initialVendors={vendors}
        vendorStats={vendorStats}
        initialContracts={contracts}
        contractStats={contractStats}
        expiringContracts={expiringContracts}
        renewalAlerts={renewalAlerts}
        initialPerformanceReviews={performanceReviews}
        performanceStats={performanceStats}
        topPerformers={topPerformers}
        spendStats={spendStats}
        initialComplianceRecords={complianceRecords}
        complianceStats={complianceStats}
        nonCompliant={nonCompliant}
        expiringCompliance={expiringCompliance}
      />
    </div>
  );
}
