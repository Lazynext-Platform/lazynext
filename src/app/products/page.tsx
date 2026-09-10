import type { Metadata } from 'next';
import { Package, Plus, DollarSign, Tag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Products — Lazynext',
  description: 'Manage your product and service catalog.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ProductService } from '@/lib/services/product';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { NewProductForm } from './NewProductForm';

export const dynamic = 'force-dynamic';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  discontinued: 'danger',
  beta: 'warning',
};

const typeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  product: 'info',
  service: 'accent',
  subscription: 'warning',
  digital: 'default',
};

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default async function ProductsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Products</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage your product and service catalog.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Package}
            title="No workspace yet"
            description="Create a company first to start managing products."
            action={<Button href="/company/new"><Plus className="h-4 w-4" /> Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const products = await ProductService.list(defaultWorkspace.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl">Products</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage your product and service catalog.</p>
        </div>
        <NewProductForm
          workspaces={workspaces.map((w) => ({ id: w.id, organizationId: w.organizationId, name: w.name }))}
          defaultWorkspaceId={defaultWorkspace.id}
          defaultOrganizationId={defaultWorkspace.organizationId}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Package className="h-3 w-3" /> Total
          </div>
          <div className="text-2xl font-semibold">{products.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Tag className="h-3 w-3" /> Active
          </div>
          <div className="text-2xl font-semibold">{products.filter((p) => p.status === 'active').length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <DollarSign className="h-3 w-3" /> Avg Price
          </div>
          <div className="text-2xl font-semibold">
            {products.length > 0
              ? formatCurrency(products.reduce((sum, p) => sum + p.price, 0) / products.length, 'USD')
              : formatCurrency(0, 'USD')}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Package className="h-3 w-3" /> Beta
          </div>
          <div className="text-2xl font-semibold">{products.filter((p) => p.status === 'beta').length}</div>
        </Card>
      </div>

      {/* Product grid */}
      {products.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first product or service to your catalog."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-sm font-semibold block truncate">{product.name}</span>
                <Badge variant={statusVariant[product.status] || 'default'} className="text-xs shrink-0">
                  {product.status}
                </Badge>
              </div>
              {product.description && (
                <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{product.description}</p>
              )}
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={typeVariant[product.type] || 'default'} className="text-xs">{product.type}</Badge>
                {product.category && (
                  <Badge variant="default" className="text-xs">{product.category}</Badge>
                )}
                {product._count.deals > 0 && (
                  <Badge variant="default" className="text-xs">{product._count.deals} deals</Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 font-medium">
                  <DollarSign className="h-3 w-3" /> {formatCurrency(product.price, product.currency)}
                </div>
                {product.unit && (
                  <span className="text-xs text-fg-muted">/{product.unit}</span>
                )}
              </div>
              {product.sku && (
                <p className="text-xs text-fg-muted mt-2">SKU: {product.sku}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
