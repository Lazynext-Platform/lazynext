'use client';

import {
  Monitor, Package, FileText, AlertTriangle, DollarSign, Calendar, Plus,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

interface ITAsset {
  id: string; name: string; type: string; category: string; status: string;
  assetTag: string; serialNumber: string; manufacturer: string; model: string;
  assignedToId: string | null; assignedToType: string; location: string;
  purchaseCost: number | null; currentValue: number | null; currency: string;
  licenseExpiry: Date | null; warrantyExpiry: Date | null;
}
interface ProcurementRequest {
  id: string; requestName: string; type: string; status: string; totalCost: number;
  currency: string; requestedBy: string; createdAt: Date;
}
interface ITContract {
  id: string; vendorName: string; title: string; contractType: string; status: string;
  startDate: Date; endDate: Date; value: number; currency: string; renewalDate: Date | null;
}
interface AssetStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}
interface ContractStats {
  total: number;
  byStatus: Record<string, number>;
  totalActiveValue: number;
}

const assetStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  assigned: 'info',
  in_storage: 'default',
  retired: 'danger',
  expired: 'warning',
};

const procurementStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'default',
  approved: 'info',
  ordered: 'warning',
  received: 'success',
  rejected: 'danger',
};

const contractStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  expired: 'danger',
  terminated: 'default',
  pending_renewal: 'warning',
};

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function daysUntil(date: Date): number {
  const now = new Date();
  const diff = new Date(date).getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function ITAssetDashboard({
  organizationId,
  assets: initialAssets,
  procurement: initialProcurement,
  contracts: initialContracts,
  expiringLicenses,
  expiringContracts,
  assetStats,
  contractStats,
}: {
  organizationId: string;
  assets: ITAsset[];
  procurement: ProcurementRequest[];
  contracts: ITContract[];
  expiringLicenses: ITAsset[];
  expiringContracts: ITContract[];
  assetStats: AssetStats;
  contractStats: ContractStats;
}) {
  void organizationId;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Monitor className="h-3 w-3" /> Total Assets
          </div>
          <div className="text-2xl font-semibold">{assetStats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Package className="h-3 w-3" /> Procurement
          </div>
          <div className="text-2xl font-semibold">{initialProcurement.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <FileText className="h-3 w-3" /> Contracts
          </div>
          <div className="text-2xl font-semibold">{contractStats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <AlertTriangle className="h-3 w-3" /> Expiring
          </div>
          <div className="text-2xl font-semibold">{expiringLicenses.length + expiringContracts.length}</div>
        </Card>
      </div>

      {/* Expiring Alerts */}
      {(expiringLicenses.length > 0 || expiringContracts.length > 0) && (
        <Card className="p-4 border-warning/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="heading-display text-sm">Expiring Soon</h2>
          </div>
          <div className="space-y-2">
            {expiringLicenses.map((asset) => {
              const days = daysUntil(asset.licenseExpiry as Date);
              return (
                <div key={asset.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-fg-muted" /> {asset.name}
                    <Badge variant="default" className="text-xs">License</Badge>
                  </span>
                  <Badge variant={days < 0 ? 'danger' : days < 7 ? 'warning' : 'info'} className="text-xs">
                    {days < 0 ? 'Expired' : `${days}d left`}
                  </Badge>
                </div>
              );
            })}
            {expiringContracts.map((contract) => {
              const days = daysUntil(contract.endDate);
              return (
                <div key={contract.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-fg-muted" /> {contract.vendorName} — {contract.title}
                    <Badge variant="default" className="text-xs">Contract</Badge>
                  </span>
                  <Badge variant={days < 0 ? 'danger' : days < 7 ? 'warning' : 'info'} className="text-xs">
                    {days < 0 ? 'Expired' : `${days}d left`}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Assets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <Monitor className="h-5 w-5 text-accent-primary" /> Assets
          </h2>
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Asset
          </Button>
        </div>
        {initialAssets.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Monitor} title="No assets yet" description="Add your first IT asset to start tracking." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {initialAssets.map((asset) => (
              <Card key={asset.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-semibold block truncate pr-2">{asset.name}</span>
                  <Badge variant={assetStatusVariant[asset.status] || 'default'} className="text-xs shrink-0">{asset.status}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="default" className="text-xs">{asset.type}</Badge>
                  {asset.category && <Badge variant="default" className="text-xs">{asset.category}</Badge>}
                </div>
                {asset.manufacturer && (
                  <div className="text-xs text-fg-secondary mb-1">{asset.manufacturer} {asset.model}</div>
                )}
                {asset.assetTag && (
                  <div className="text-xs text-fg-muted mb-1">Tag: {asset.assetTag}</div>
                )}
                {asset.assignedToId && (
                  <div className="text-xs text-fg-secondary mb-1">
                    Assigned to {asset.assignedToType}
                  </div>
                )}
                {asset.purchaseCost != null && (
                  <div className="flex items-center gap-1 text-xs text-fg-muted">
                    <DollarSign className="h-3 w-3" /> {formatCurrency(asset.purchaseCost, asset.currency)}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Procurement Requests */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Package className="h-5 w-5 text-accent-primary" /> Procurement Requests
        </h2>
        {initialProcurement.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Package} title="No procurement requests" description="Submit a purchase or renewal request." />
          </Card>
        ) : (
          <div className="space-y-2">
            {initialProcurement.map((req) => (
              <Card key={req.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold block truncate">{req.requestName}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="default" className="text-xs">{req.type}</Badge>
                      <span className="text-xs text-fg-muted">{formatCurrency(req.totalCost, req.currency)}</span>
                    </div>
                  </div>
                  <Badge variant={procurementStatusVariant[req.status] || 'default'} className="text-xs shrink-0">{req.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Contracts */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent-primary" /> Contracts
        </h2>
        {initialContracts.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={FileText} title="No contracts yet" description="Add vendor contracts to track renewals and value." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {initialContracts.map((contract) => (
              <Card key={contract.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold block truncate">{contract.vendorName}</span>
                    <span className="text-xs text-fg-secondary">{contract.title}</span>
                  </div>
                  <Badge variant={contractStatusVariant[contract.status] || 'default'} className="text-xs shrink-0">{contract.status}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="default" className="text-xs">{contract.contractType}</Badge>
                  <span className="text-xs text-fg-muted flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> {formatCurrency(contract.value, contract.currency)}
                  </span>
                </div>
                <div className="text-xs text-fg-muted flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(contract.startDate).toLocaleDateString()} — {new Date(contract.endDate).toLocaleDateString()}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
