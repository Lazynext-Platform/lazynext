'use client';

import { useState, useMemo } from 'react';
import {
  ShieldCheck, Search, AlertTriangle, Wrench, ClipboardList, BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  QaInspection, QaDefect, QaCapa, QaAudit,
  QualityAssuranceMetrics, QualityAssuranceStats,
} from '@/lib/services/quality-assurance-service';

type TabId = 'overview' | 'inspections' | 'defects' | 'capa' | 'audits';

interface QualityAssuranceDashboardProps {
  organizationId: string;
  inspections: QaInspection[];
  defects: QaDefect[];
  capas: QaCapa[];
  audits: QaAudit[];
  metrics: QualityAssuranceMetrics;
  stats: QualityAssuranceStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['passed', 'resolved', 'closed', 'verified', 'implemented', 'completed'].includes(status)) return 'success';
  if (['scheduled', 'in_progress', 'investigating', 'open', 'planned', 'pending'].includes(status)) return 'warning';
  if (['failed', 'cancelled', 'rejected', 'critical'].includes(status)) return 'danger';
  return 'info';
};

const severityVariant = (severity: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (severity === 'minor') return 'info';
  if (severity === 'cosmetic') return 'info';
  if (severity === 'medium' || severity === 'major') return 'warning';
  if (severity === 'high' || severity === 'critical') return 'danger';
  return 'default';
};

export function QualityAssuranceDashboard({
  inspections, defects, capas, audits, metrics, stats,
}: QualityAssuranceDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredInspections = useMemo(() => {
    if (!search) return inspections;
    const q = search.toLowerCase();
    return inspections.filter(
      (i) => i.productName.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.status.toLowerCase().includes(q) || i.inspector.toLowerCase().includes(q),
    );
  }, [inspections, search]);

  const filteredDefects = useMemo(() => {
    if (!search) return defects;
    const q = search.toLowerCase();
    return defects.filter(
      (d) => d.title.toLowerCase().includes(q) || d.type.toLowerCase().includes(q) || d.severity.toLowerCase().includes(q) || d.status.toLowerCase().includes(q),
    );
  }, [defects, search]);

  const filteredCapas = useMemo(() => {
    if (!search) return capas;
    const q = search.toLowerCase();
    return capas.filter(
      (c) => c.title.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.priority.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [capas, search]);

  const filteredAudits = useMemo(() => {
    if (!search) return audits;
    const q = search.toLowerCase();
    return audits.filter(
      (a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q) || a.auditor.toLowerCase().includes(q),
    );
  }, [audits, search]);

  const tabs: { id: TabId; label: string; icon: typeof ShieldCheck }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'inspections', label: 'Inspections', icon: ShieldCheck },
    { id: 'defects', label: 'Defects', icon: AlertTriangle },
    { id: 'capa', label: 'CAPA', icon: Wrench },
    { id: 'audits', label: 'Audits', icon: ClipboardList },
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
              <div className="text-xs text-fg-tertiary">Open Defects</div>
              <div className="mt-1 text-2xl font-bold">{metrics.openDefects}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Critical Defects</div>
              <div className="mt-1 text-2xl font-bold">{metrics.criticalDefects}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Open CAPAs</div>
              <div className="mt-1 text-2xl font-bold">{metrics.openCapas}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">CAPA Completion</div>
              <div className="mt-1 text-2xl font-bold">{metrics.capaCompletionRate}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Inspection Pass Rate</div>
              <div className="mt-1 text-2xl font-bold">{metrics.inspectionPassRate}%</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Inspection Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byInspectionType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Defect Severity Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byDefectSeverity).map(([sev, count]) => (
                <Badge key={sev} variant={severityVariant(sev)}>{sev}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">CAPA Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCapaStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Audit Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAuditType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'inspections' && (
        <div className="space-y-3">
          {filteredInspections.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ShieldCheck} title="No inspections" description="Quality inspections will appear here." /></Card>
          ) : (
            filteredInspections.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.productName || 'Unnamed inspection'}</div>
                    <div className="text-sm text-fg-secondary">{i.type.replace('_', ' ')} · {i.inspector || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.sampleSize > 0 && <Badge variant="default">n={i.sampleSize}</Badge>}
                    <Badge variant={statusVariant(i.status)}>{i.status.replace('_', ' ')}</Badge>
                    <Badge variant={i.result === 'pass' ? 'success' : i.result === 'fail' ? 'danger' : 'warning'}>{i.result.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'defects' && (
        <div className="space-y-3">
          {filteredDefects.length === 0 ? (
            <Card className="p-8"><EmptyState icon={AlertTriangle} title="No defects" description="Quality defects will appear here." /></Card>
          ) : (
            filteredDefects.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.title}</div>
                    <div className="text-sm text-fg-secondary">{d.type.replace('_', ' ')} · {d.identifiedBy || 'Unknown'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={severityVariant(d.severity)}>{d.severity}</Badge>
                    <Badge variant={statusVariant(d.status)}>{d.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'capa' && (
        <div className="space-y-3">
          {filteredCapas.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Wrench} title="No CAPAs" description="Corrective and preventive actions will appear here." /></Card>
          ) : (
            filteredCapas.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.assignedTo || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={severityVariant(c.priority)}>{c.priority}</Badge>
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'audits' && (
        <div className="space-y-3">
          {filteredAudits.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ClipboardList} title="No audits" description="Quality audits will appear here." /></Card>
          ) : (
            filteredAudits.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.auditor || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.scheduledDate && <Badge variant="default">{new Date(a.scheduledDate).toLocaleDateString()}</Badge>}
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
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
