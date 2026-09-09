import type { Metadata } from 'next';
import { Handshake, Plus, DollarSign, User, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Deals — Lazynext',
  description: 'Sales pipeline kanban — track deals from lead to won.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DealService, CustomerService } from '@/lib/services/crm';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { NewDealForm } from './NewDealForm';

export const dynamic = 'force-dynamic';

const stageVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  lead: 'info',
  qualified: 'accent',
  proposal: 'warning',
  negotiation: 'warning',
  won: 'success',
  lost: 'danger',
};

const pipelineStages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default async function DealsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Deals</h1>
          <p className="text-sm text-fg-secondary mt-1">Sales pipeline kanban — track deals from lead to won.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Handshake}
            title="No workspace yet"
            description="Create a company first to start managing deals."
            action={<Button href="/company/new"><Plus className="h-4 w-4" /> Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const [deals, customers, pipelineStats] = await Promise.all([
    DealService.list(defaultWorkspace.id),
    CustomerService.list(defaultWorkspace.id),
    DealService.getPipelineStats(defaultWorkspace.id),
  ]);

  const dealsByStage: Record<string, typeof deals> = {};
  for (const s of pipelineStages) {
    dealsByStage[s] = [];
  }
  for (const d of deals) {
    const s = pipelineStages.includes(d.stage as typeof pipelineStages[number]) ? d.stage : 'lead';
    dealsByStage[s].push(d);
  }

  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
  const wonValue = (pipelineStats['won']?.totalValue || 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl">Deals</h1>
          <p className="text-sm text-fg-secondary mt-1">Sales pipeline kanban — track deals from lead to won.</p>
        </div>
        <NewDealForm
          workspaces={workspaces.map((w) => ({ id: w.id, organizationId: w.organizationId, name: w.name }))}
          defaultWorkspaceId={defaultWorkspace.id}
          defaultOrganizationId={defaultWorkspace.organizationId}
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Handshake className="h-3 w-3" /> Total Deals
          </div>
          <div className="text-2xl font-semibold">{deals.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <DollarSign className="h-3 w-3" /> Pipeline Value
          </div>
          <div className="text-2xl font-semibold">{formatCurrency(totalValue, 'USD')}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <TrendingUp className="h-3 w-3" /> Won Value
          </div>
          <div className="text-2xl font-semibold">{formatCurrency(wonValue, 'USD')}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <User className="h-3 w-3" /> Customers
          </div>
          <div className="text-2xl font-semibold">{customers.length}</div>
        </Card>
      </div>

      {/* Kanban board */}
      {deals.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Handshake}
            title="No deals yet"
            description="Create your first deal to start tracking your sales pipeline. You'll need at least one customer first."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          {pipelineStages.map((stage) => (
            <div key={stage} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="heading-display text-sm capitalize">{stage}</h2>
                <Badge variant={stageVariant[stage]} className="text-xs">{dealsByStage[stage].length}</Badge>
              </div>
              {dealsByStage[stage].length === 0 ? (
                <Card className="p-4 border-border-primary border-dashed">
                  <p className="text-xs text-fg-muted text-center">No deals</p>
                </Card>
              ) : (
                dealsByStage[stage].map((deal) => (
                  <Card key={deal.id} className="p-4">
                    <span className="text-sm font-semibold block truncate mb-1">{deal.title}</span>
                    {deal.customer && (
                      <div className="flex items-center gap-1 text-xs text-fg-secondary mb-2">
                        <User className="h-3 w-3" /> <span className="truncate">{deal.customer.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-sm font-medium mb-2">
                      <DollarSign className="h-3 w-3" /> {formatCurrency(deal.value, deal.currency)}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="default" className="text-xs">{deal.probability}%</Badge>
                      {deal.product && (
                        <span className="text-xs text-fg-muted truncate ml-2">{deal.product.name}</span>
                      )}
                    </div>
                    {deal.expectedCloseDate && (
                      <p className="text-xs text-fg-muted mt-2">
                        Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}
                      </p>
                    )}
                  </Card>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
