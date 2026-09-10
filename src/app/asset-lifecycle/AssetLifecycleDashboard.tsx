'use client';

import {
  Wrench, ShieldCheck, TrendingDown, Trash2, QrCode, AlertTriangle, Calendar, DollarSign,
} from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';

interface Maintenance {
  id: string; title: string; type: string; status: string; scheduledDate: Date;
  completedDate: Date | null; cost: number; itAssetId: string; vendorName: string | null;
}
interface MaintenanceStats {
  total: number; byType: Record<string, number>; byStatus: Record<string, number>;
  overdue: number; totalCost: number;
}
interface Warranty {
  id: string; provider: string; type: string; status: string; startDate: Date;
  endDate: Date; itAssetId: string; coverage: string;
}
interface WarrantyStats {
  total: number; byStatus: Record<string, number>; activeCount: number; expiringCount: number;
}
interface DepreciationResult {
  assetId: string; name: string; purchaseCost: number; salvageValue: number;
  usefulLifeYears: number; annualDepreciation: number; accumulatedDepreciation: number;
  bookValue: number; depreciationRate: number; yearsElapsed: number;
}
interface DepreciationSummary {
  totalAssets: number; totalCost: number; totalAccumulatedDepreciation: number; totalBookValue: number;
}
interface Disposal {
  id: string; itAssetId?: string; assetName?: string; disposalDate?: string;
  disposalMethod?: string; disposalValue?: number; reason?: string; recordedAt: Date;
}
interface AssetTag {
  assetId: string; name: string; tag: string; assetTag: string; serialNumber: string;
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'default',
  overdue: 'danger',
  active: 'success',
  expired: 'danger',
  void: 'default',
};

export function AssetLifecycleDashboard({
  organizationId,
  upcoming,
  overdue,
  maintenanceStats,
  warranties,
  warrantyStats,
  depreciationReport,
  depreciationSummary,
  disposals,
  tags,
}: {
  organizationId: string;
  upcoming: Maintenance[];
  overdue: Maintenance[];
  maintenanceStats: MaintenanceStats;
  warranties: Warranty[];
  warrantyStats: WarrantyStats;
  depreciationReport: DepreciationResult[];
  depreciationSummary: DepreciationSummary;
  disposals: Disposal[];
  tags: AssetTag[];
}) {
  void organizationId;
  const now = new Date();
  const expiringWarranties = warranties.filter((w) => {
    if (w.status !== 'active') return false;
    const days = (new Date(w.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  });
  const expiredWarranties = warranties.filter((w) => {
    if (w.status === 'expired') return true;
    return new Date(w.endDate) < now && w.status === 'active';
  });

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Wrench className="h-3 w-3" /> Maintenance
          </div>
          <div className="text-2xl font-semibold">{maintenanceStats.total}</div>
          {maintenanceStats.overdue > 0 && (
            <div className="text-xs text-danger mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {maintenanceStats.overdue} overdue
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <ShieldCheck className="h-3 w-3" /> Active Warranties
          </div>
          <div className="text-2xl font-semibold">{warrantyStats.activeCount}</div>
          {warrantyStats.expiringCount > 0 && (
            <div className="text-xs text-warning mt-1">{warrantyStats.expiringCount} expiring</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <TrendingDown className="h-3 w-3" /> Total Book Value
          </div>
          <div className="text-2xl font-semibold">${depreciationSummary.totalBookValue.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <DollarSign className="h-3 w-3" /> Maintenance Cost
          </div>
          <div className="text-2xl font-semibold">${maintenanceStats.totalCost.toLocaleString()}</div>
        </Card>
      </div>

      {/* Overdue Maintenance */}
      {overdue.length > 0 && (
        <div>
          <h2 className="heading-display text-lg mb-3 flex items-center gap-2 text-danger">
            <AlertTriangle className="h-5 w-5" /> Overdue Maintenance ({overdue.length})
          </h2>
          <div className="space-y-2">
            {overdue.map((m) => (
              <Card key={m.id} className="p-4 border-danger/30">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold truncate">{m.title}</span>
                  <Badge variant="danger" className="text-xs shrink-0">overdue</Badge>
                </div>
                <div className="text-xs text-fg-muted mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Was due {new Date(m.scheduledDate).toLocaleDateString()}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Maintenance */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-accent-primary" /> Upcoming Maintenance
        </h2>
        {upcoming.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Wrench} title="No upcoming maintenance" description="Scheduled maintenance will appear here." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-semibold block truncate pr-2">{m.title}</span>
                  <Badge variant={statusVariant[m.status] || 'default'} className="text-xs shrink-0">{m.status}</Badge>
                </div>
                <div className="text-xs text-fg-muted flex items-center gap-1 mb-1">
                  <Calendar className="h-3 w-3" /> {new Date(m.scheduledDate).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-xs text-fg-secondary">
                  <Badge variant="default" className="text-xs">{m.type}</Badge>
                  {m.vendorName && <span className="truncate">{m.vendorName}</span>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Warranty Tracking */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent-primary" /> Warranties
        </h2>
        {warranties.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={ShieldCheck} title="No warranties" description="Add warranties to track coverage for your assets." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {warranties.slice(0, 12).map((w) => {
              const isExpired = new Date(w.endDate) < now;
              const daysLeft = Math.floor((new Date(w.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <Card key={w.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-semibold block truncate pr-2">{w.provider}</span>
                    <Badge variant={isExpired ? 'danger' : daysLeft <= 30 ? 'warning' : 'success'} className="text-xs shrink-0">
                      {isExpired ? 'expired' : `${daysLeft}d left`}
                    </Badge>
                  </div>
                  <div className="text-xs text-fg-muted mb-1">
                    {new Date(w.startDate).toLocaleDateString()} — {new Date(w.endDate).toLocaleDateString()}
                  </div>
                  <Badge variant="default" className="text-xs">{w.type}</Badge>
                </Card>
              );
            })}
          </div>
        )}
        {expiringWarranties.length > 0 && (
          <div className="text-xs text-warning mt-2">{expiringWarranties.length} warranty(ies) expiring within 30 days</div>
        )}
        {expiredWarranties.length > 0 && (
          <div className="text-xs text-danger mt-1">{expiredWarranties.length} expired warranty(ies)</div>
        )}
      </div>

      {/* Depreciation Report */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-accent-primary" /> Depreciation Report
        </h2>
        {depreciationReport.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={TrendingDown} title="No depreciation data" description="Assets with purchase costs will show depreciation here." />
          </Card>
        ) : (
          <Card className="p-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-fg-secondary border-b border-border">
                  <th className="pb-2 pr-4">Asset</th>
                  <th className="pb-2 pr-4 text-right">Cost</th>
                  <th className="pb-2 pr-4 text-right">Acc. Dep.</th>
                  <th className="pb-2 pr-4 text-right">Book Value</th>
                  <th className="pb-2 text-right">Rate</th>
                </tr>
              </thead>
              <tbody>
                {depreciationReport.slice(0, 20).map((d) => (
                  <tr key={d.assetId} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium truncate max-w-[200px]">{d.name}</td>
                    <td className="py-2 pr-4 text-right">${d.purchaseCost.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right">${d.accumulatedDepreciation.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right font-semibold">${d.bookValue.toLocaleString()}</td>
                    <td className="py-2 text-right">{d.depreciationRate}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t border-border">
                  <td className="pt-2 pr-4">Total ({depreciationSummary.totalAssets})</td>
                  <td className="pt-2 pr-4 text-right">${depreciationSummary.totalCost.toLocaleString()}</td>
                  <td className="pt-2 pr-4 text-right">${depreciationSummary.totalAccumulatedDepreciation.toLocaleString()}</td>
                  <td className="pt-2 pr-4 text-right">${depreciationSummary.totalBookValue.toLocaleString()}</td>
                  <td className="pt-2"></td>
                </tr>
              </tfoot>
            </table>
          </Card>
        )}
      </div>

      {/* Disposals */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-accent-primary" /> Disposal Records
        </h2>
        {disposals.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Trash2} title="No disposals" description="Disposed assets will be tracked here." />
          </Card>
        ) : (
          <div className="space-y-2">
            {disposals.slice(0, 10).map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold block truncate">{d.assetName || d.itAssetId}</span>
                    {d.reason && <p className="text-xs text-fg-secondary mt-1 truncate">{d.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="default" className="text-xs">{d.disposalMethod}</Badge>
                    <span className="text-xs text-fg-muted">${(d.disposalValue ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Asset Tags */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-accent-primary" /> Asset Tags
        </h2>
        {tags.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={QrCode} title="No asset tags" description="Asset tags for QR labeling will appear here." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tags.slice(0, 12).map((t) => (
              <Card key={t.assetId} className="p-3">
                <div className="text-sm font-semibold truncate">{t.name}</div>
                <div className="text-xs text-fg-muted font-mono mt-1 truncate">{t.tag}</div>
                {t.serialNumber && <div className="text-xs text-fg-secondary mt-1">S/N: {t.serialNumber}</div>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
