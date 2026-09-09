'use client';

import { useState, useMemo } from 'react';
import {
  FileText, FileCheck, Award, DollarSign, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  PatentApplication, PatentDocument, PatentLicense, PatentMaintenance,
  PatentManagementMetrics, PatentManagementStats,
} from '@/lib/services/patent-management-service';

type TabId = 'overview' | 'applications' | 'documents' | 'licenses' | 'maintenance';

interface PatentManagementDashboardProps {
  organizationId: string;
  applications: PatentApplication[];
  documents: PatentDocument[];
  licenses: PatentLicense[];
  maintenance: PatentMaintenance[];
  metrics: PatentManagementMetrics;
  stats: PatentManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['granted', 'active', 'paid', 'filed'].includes(status)) return 'success';
  if (['draft', 'pending', 'under_examination', 'office_action', 'filed'].includes(status)) return 'warning';
  if (['rejected', 'abandoned', 'expired', 'terminated', 'revoked', 'overdue', 'lapsed'].includes(status)) return 'danger';
  return 'info';
};

export function PatentManagementDashboard({
  applications, documents, licenses, maintenance, metrics, stats,
}: PatentManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const applicationTitle = (id: string) => applications.find((a) => a.id === id)?.title || id;

  const filteredApplications = useMemo(() => {
    if (!search) return applications;
    const q = search.toLowerCase();
    return applications.filter(
      (a) => a.title.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [applications, search]);

  const filteredDocuments = useMemo(() => {
    if (!search) return documents;
    const q = search.toLowerCase();
    return documents.filter(
      (d) => d.title.toLowerCase().includes(q) || d.type.toLowerCase().includes(q) || applicationTitle(d.applicationId).toLowerCase().includes(q),
    );
  }, [documents, search, applications]);

  const filteredLicenses = useMemo(() => {
    if (!search) return licenses;
    const q = search.toLowerCase();
    return licenses.filter(
      (l) => l.licensee.toLowerCase().includes(q) || l.type.toLowerCase().includes(q) || l.status.toLowerCase().includes(q),
    );
  }, [licenses, search]);

  const filteredMaintenance = useMemo(() => {
    if (!search) return maintenance;
    const q = search.toLowerCase();
    return maintenance.filter(
      (m) => m.type.toLowerCase().includes(q) || m.status.toLowerCase().includes(q) || applicationTitle(m.applicationId).toLowerCase().includes(q),
    );
  }, [maintenance, search, applications]);

  const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'documents', label: 'Documents', icon: FileCheck },
    { id: 'licenses', label: 'Licenses', icon: Award },
    { id: 'maintenance', label: 'Maintenance', icon: DollarSign },
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
              <div className="text-xs text-fg-tertiary">Total Applications</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalApplications}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Granted Patents</div>
              <div className="mt-1 text-2xl font-bold">{metrics.grantedPatents}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Examination</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingExamination}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Licenses</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeLicenses}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Maintenance Fees</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingMaintenanceFees}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Application Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byApplicationType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Application Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byApplicationStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">License Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byLicenseType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Maintenance Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byMaintenanceStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'applications' && (
        <div className="space-y-3">
          {filteredApplications.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No applications" description="Patent applications will appear here." /></Card>
          ) : (
            filteredApplications.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.inventor || 'Unknown inventor'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.applicationNumber && <Badge variant="default">{a.applicationNumber}</Badge>}
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-3">
          {filteredDocuments.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileCheck} title="No documents" description="Patent documents will appear here." /></Card>
          ) : (
            filteredDocuments.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.title}</div>
                    <div className="text-sm text-fg-secondary">{d.type.replace('_', ' ')} · {applicationTitle(d.applicationId)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.pageCount > 0 && <Badge variant="default">{d.pageCount} pages</Badge>}
                    <Badge variant="info">{d.status || 'draft'}</Badge>
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
            <Card className="p-8"><EmptyState icon={Award} title="No licenses" description="Patent licenses will appear here." /></Card>
          ) : (
            filteredLicenses.map((l) => (
              <Card key={l.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{l.licensee}</div>
                    <div className="text-sm text-fg-secondary">{l.type.replace('_', ' ')} · {applicationTitle(l.applicationId)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.royaltyRate > 0 && <Badge variant="default">{l.royaltyRate}% royalty</Badge>}
                    <Badge variant={statusVariant(l.status)}>{l.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'maintenance' && (
        <div className="space-y-3">
          {filteredMaintenance.length === 0 ? (
            <Card className="p-8"><EmptyState icon={DollarSign} title="No maintenance fees" description="Maintenance fee records will appear here." /></Card>
          ) : (
            filteredMaintenance.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.type.replace('_', ' ')}</div>
                    <div className="text-sm text-fg-secondary">{applicationTitle(m.applicationId)} · {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'No due date'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{m.amount.toLocaleString()} {m.currency}</Badge>
                    <Badge variant={statusVariant(m.status)}>{m.status.replace('_', ' ')}</Badge>
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
