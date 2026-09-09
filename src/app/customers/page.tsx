import type { Metadata } from 'next';
import { Users, Plus, Mail, Phone, Building2, DollarSign } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Customers — Lazynext',
  description: 'Manage your CRM pipeline — leads, prospects, customers, and churned.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerService } from '@/lib/services/crm';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { NewCustomerForm } from './NewCustomerForm';

export const dynamic = 'force-dynamic';

const typeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  lead: 'info',
  prospect: 'accent',
  customer: 'success',
  churned: 'danger',
  partner: 'default',
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  new: 'default',
  contacted: 'info',
  qualified: 'accent',
  proposal: 'warning',
  negotiation: 'warning',
  won: 'success',
  lost: 'danger',
};

const pipelineTypes = ['lead', 'prospect', 'customer', 'churned'] as const;

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default async function CustomersPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Customers</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage your CRM pipeline — leads, prospects, customers, and churned.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Users}
            title="No workspace yet"
            description="Create a company first to start managing customers."
            action={<Button href="/company/new"><Plus className="h-4 w-4" /> Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const customers = await CustomerService.list(defaultWorkspace.id);

  const customersByType: Record<string, typeof customers> = {};
  for (const t of pipelineTypes) {
    customersByType[t] = [];
  }
  for (const c of customers) {
    const t = pipelineTypes.includes(c.type as typeof pipelineTypes[number]) ? c.type : 'lead';
    customersByType[t].push(c);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl">Customers</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage your CRM pipeline — leads, prospects, customers, and churned.</p>
        </div>
        <NewCustomerForm
          workspaces={workspaces.map((w) => ({ id: w.id, organizationId: w.organizationId, name: w.name }))}
          defaultWorkspaceId={defaultWorkspace.id}
          defaultOrganizationId={defaultWorkspace.organizationId}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        {pipelineTypes.map((t) => (
          <Card key={t} className="p-4">
            <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1 capitalize">
              <Users className="h-3 w-3" /> {t}s
            </div>
            <div className="text-2xl font-semibold">{customersByType[t].length}</div>
          </Card>
        ))}
      </div>

      {/* Pipeline columns */}
      {customers.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add your first customer or lead to start tracking your sales pipeline."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {pipelineTypes.map((t) => (
            <div key={t} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="heading-display text-sm capitalize">{t}s</h2>
                <Badge variant={typeVariant[t]} className="text-xs">{customersByType[t].length}</Badge>
              </div>
              {customersByType[t].length === 0 ? (
                <Card className="p-4 border-border-primary border-dashed">
                  <p className="text-xs text-fg-muted text-center">No {t}s</p>
                </Card>
              ) : (
                customersByType[t].map((customer) => (
                  <Card key={customer.id} className="p-4">
                    <div className="mb-2">
                      <span className="text-sm font-semibold block truncate">{customer.name}</span>
                      {customer.company && (
                        <div className="flex items-center gap-1 text-xs text-fg-secondary mt-0.5">
                          <Building2 className="h-3 w-3" /> {customer.company}
                        </div>
                      )}
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
                        <Mail className="h-3 w-3" /> <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-1 text-xs text-fg-secondary mb-2">
                        <Phone className="h-3 w-3" /> {customer.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={statusVariant[customer.status] || 'default'} className="text-xs">{customer.status}</Badge>
                      {customer._count.deals > 0 && (
                        <Badge variant="default" className="text-xs">{customer._count.deals} deals</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-fg-muted">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> {formatCurrency(customer.value, customer.currency)}
                      </div>
                      {customer.lastContactedAt && (
                        <span>{new Date(customer.lastContactedAt).toLocaleDateString()}</span>
                      )}
                    </div>
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
