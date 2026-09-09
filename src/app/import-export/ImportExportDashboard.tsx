'use client';

import { useState, useMemo } from 'react';
import {
  Ship, FileCheck, Award, Percent, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  ImportExportShipment, CustomsDeclaration, TradeLicense, TariffRecord,
  ImportExportMetrics, ImportExportStats,
} from '@/lib/services/import-export-service';

type TabId = 'overview' | 'shipments' | 'declarations' | 'licenses' | 'tariffs';

interface ImportExportDashboardProps {
  organizationId: string;
  shipments: ImportExportShipment[];
  declarations: CustomsDeclaration[];
  licenses: TradeLicense[];
  tariffs: TariffRecord[];
  metrics: ImportExportMetrics;
  stats: ImportExportStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['cleared', 'delivered', 'approved', 'active'].includes(status)) return 'success';
  if (['draft', 'filed', 'in_transit', 'arrived', 'submitted', 'under_review', 'pending', 'scheduled'].includes(status)) return 'warning';
  if (['rejected', 'cancelled', 'revoked', 'suspended', 'held', 'expired', 'repealed'].includes(status)) return 'danger';
  return 'info';
};

export function ImportExportDashboard({
  shipments, declarations, licenses, tariffs, metrics, stats,
}: ImportExportDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredShipments = useMemo(() => {
    if (!search) return shipments;
    const q = search.toLowerCase();
    return shipments.filter(
      (s) => s.reference.toLowerCase().includes(q) || s.direction.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [shipments, search]);

  const filteredDeclarations = useMemo(() => {
    if (!search) return declarations;
    const q = search.toLowerCase();
    return declarations.filter(
      (d) => d.reference.toLowerCase().includes(q) || d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q),
    );
  }, [declarations, search]);

  const filteredLicenses = useMemo(() => {
    if (!search) return licenses;
    const q = search.toLowerCase();
    return licenses.filter(
      (l) => l.reference.toLowerCase().includes(q) || l.type.toLowerCase().includes(q) || l.status.toLowerCase().includes(q),
    );
  }, [licenses, search]);

  const filteredTariffs = useMemo(() => {
    if (!search) return tariffs;
    const q = search.toLowerCase();
    return tariffs.filter(
      (t) => t.hsCode.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [tariffs, search]);

  const tabs: { id: TabId; label: string; icon: typeof Ship }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'shipments', label: 'Shipments', icon: Ship },
    { id: 'declarations', label: 'Declarations', icon: FileCheck },
    { id: 'licenses', label: 'Licenses', icon: Award },
    { id: 'tariffs', label: 'Tariffs', icon: Percent },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'overview' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-primary px-10 py-2 text-sm focus:border-accent-primary focus:outline-none"
          />
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Shipments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeShipments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Declarations</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingDeclarations}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Licenses</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeLicenses}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Tariffs</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeTariffs}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Clearance Rate</div>
              <div className="mt-1 text-2xl font-bold">{metrics.shipmentClearanceRate}%</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Shipment Direction Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byShipmentDirection).map(([dir, count]) => (
                <Badge key={dir} variant="info">{dir.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Shipment Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byShipmentStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Declaration Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byDeclarationStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">License Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byLicenseStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Tariff Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTariffType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'shipments' && (
        <div className="space-y-3">
          {filteredShipments.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Ship} title="No shipments" description="Shipments will appear here." /></Card>
          ) : (
            filteredShipments.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.reference}</div>
                    <div className="text-sm text-fg-secondary">{s.direction.replace('_', ' ')} · {s.type} · {s.carrier || 'No carrier'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.value > 0 && <Badge variant="default">{s.currency} {s.value.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'declarations' && (
        <div className="space-y-3">
          {filteredDeclarations.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileCheck} title="No declarations" description="Customs declarations will appear here." /></Card>
          ) : (
            filteredDeclarations.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.reference}</div>
                    <div className="text-sm text-fg-secondary">{d.type.replace('_', ' ')} · {d.country || 'No country'} · {d.hsCode || 'No HS code'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.declaredValue > 0 && <Badge variant="default">{d.currency} {d.declaredValue.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(d.status)}>{d.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'licenses' && (
        <div className="space-y-3">
          {filteredLicenses.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Award} title="No licenses" description="Trade licenses will appear here." /></Card>
          ) : (
            filteredLicenses.map((l) => (
              <Card key={l.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{l.reference}</div>
                    <div className="text-sm text-fg-secondary">{l.type.replace('_', ' ')} · {l.holder || 'No holder'} · {l.country || 'No country'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.validTo && <Badge variant="default">Until {new Date(l.validTo).toLocaleDateString()}</Badge>}
                    <Badge variant={statusVariant(l.status)}>{l.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'tariffs' && (
        <div className="space-y-3">
          {filteredTariffs.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Percent} title="No tariffs" description="Tariff records will appear here." /></Card>
          ) : (
            filteredTariffs.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.hsCode}</div>
                    <div className="text-sm text-fg-secondary">{t.description} · {t.type.replace('_', ' ')} · {t.country || 'No country'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{t.rate}%</Badge>
                    <Badge variant={statusVariant(t.status)}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
