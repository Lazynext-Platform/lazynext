'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  BadgeCheck, FileText, Image, ClipboardCheck, AlertTriangle,
  Search, BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  BrandGuideline, BrandAsset, BrandAudit, BrandConsistency,
  BrandManagementMetrics, BrandManagementStats,
  GuidelineStatus, AssetStatus, AuditStatus, ConsistencyStatus, ConsistencySeverity,
} from '@/lib/services/brand-management-service';

type TabId = 'overview' | 'guidelines' | 'assets' | 'audits' | 'consistency';

interface BrandManagementDashboardProps {
  organizationId: string;
  guidelines: BrandGuideline[];
  assets: BrandAsset[];
  audits: BrandAudit[];
  consistencies: BrandConsistency[];
  metrics: BrandManagementMetrics;
  stats: BrandManagementStats;
}

const guidelineStatusVariant = (status: GuidelineStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'active') return 'success';
  if (status === 'draft' || status === 'under_review') return 'warning';
  if (status === 'archived') return 'default';
  return 'info';
};

const assetStatusVariant = (status: AssetStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'active') return 'success';
  if (status === 'pending_approval') return 'warning';
  if (status === 'deprecated') return 'danger';
  if (status === 'archived') return 'default';
  return 'info';
};

const auditStatusVariant = (status: AuditStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'completed') return 'success';
  if (status === 'planned' || status === 'in_progress') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'info';
};

const consistencyStatusVariant = (status: ConsistencyStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'compliant') return 'success';
  if (status === 'minor_issue') return 'warning';
  if (status === 'major_issue' || status === 'non_compliant') return 'danger';
  return 'info';
};

const severityVariant = (severity: ConsistencySeverity): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (severity === 'low') return 'info';
  if (severity === 'medium') return 'warning';
  if (severity === 'high') return 'danger';
  if (severity === 'critical') return 'danger';
  return 'default';
};

export function BrandManagementDashboard({
  guidelines, assets, audits, consistencies, metrics, stats,
}: BrandManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const guidelineTitle = useCallback(
    (id: string) => guidelines.find((g) => g.id === id)?.title || id,
    [guidelines],
  );

  const filteredGuidelines = useMemo(() => {
    if (!search) return guidelines;
    const q = search.toLowerCase();
    return guidelines.filter(
      (g) => g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q) || g.status.toLowerCase().includes(q),
    );
  }, [guidelines, search]);

  const filteredAssets = useMemo(() => {
    if (!search) return assets;
    const q = search.toLowerCase();
    return assets.filter(
      (a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [assets, search]);

  const filteredAudits = useMemo(() => {
    if (!search) return audits;
    const q = search.toLowerCase();
    return audits.filter(
      (a) => a.title.toLowerCase().includes(q) || a.frequency.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [audits, search]);

  const filteredConsistencies = useMemo(() => {
    if (!search) return consistencies;
    const q = search.toLowerCase();
    return consistencies.filter(
      (c) => c.title.toLowerCase().includes(q) || c.status.toLowerCase().includes(q) || c.severity.toLowerCase().includes(q),
    );
  }, [consistencies, search]);

  const tabs: { id: TabId; label: string; icon: typeof BadgeCheck }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'guidelines', label: 'Guidelines', icon: FileText },
    { id: 'assets', label: 'Assets', icon: Image },
    { id: 'audits', label: 'Audits', icon: ClipboardCheck },
    { id: 'consistency', label: 'Consistency', icon: AlertTriangle },
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Guidelines</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeGuidelines}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Assets</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeAssets}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Pending Audits</div>
              <div className="mt-1 text-2xl font-bold">{metrics.pendingAudits}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Compliance Issues</div>
              <div className="mt-1 text-2xl font-bold">{metrics.complianceIssues}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Guideline Category Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byGuidelineCategory).map(([cat, count]) => (
                <Badge key={cat} variant="info">{cat.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Asset Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAssetType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Audit Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAuditStatus).map(([status, count]) => (
                <Badge key={status} variant={auditStatusVariant(status as AuditStatus)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Consistency Severity Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byConsistencySeverity).map(([sev, count]) => (
                <Badge key={sev} variant={severityVariant(sev as ConsistencySeverity)}>{sev}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'guidelines' && (
        <div className="space-y-3">
          {filteredGuidelines.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No brand guidelines" description="Brand guidelines will appear here." /></Card>
          ) : (
            filteredGuidelines.map((g) => (
              <Card key={g.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{g.title}</div>
                    <div className="text-sm text-fg-secondary">{g.category.replace('_', ' ')} · v{g.version} · {g.reviewedBy || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{g.category.replace('_', ' ')}</Badge>
                    <Badge variant={guidelineStatusVariant(g.status)}>{g.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'assets' && (
        <div className="space-y-3">
          {filteredAssets.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Image} title="No brand assets" description="Brand assets will appear here." /></Card>
          ) : (
            filteredAssets.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.uploadedBy || 'Unknown'} · {a.fileType || 'N/A'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.fileSize > 0 && <Badge variant="default">{(a.fileSize / 1024).toFixed(0)} KB</Badge>}
                    <Badge variant={assetStatusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={ClipboardCheck} title="No brand audits" description="Brand audits will appear here." /></Card>
          ) : (
            filteredAudits.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-fg-secondary">{a.frequency.replace('_', ' ')} · {a.leadAuditor || 'Unassigned'} · {a.startDate ? new Date(a.startDate).toLocaleDateString() : 'No start date'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.score > 0 && <Badge variant="default">Score: {a.score}</Badge>}
                    <Badge variant={auditStatusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'consistency' && (
        <div className="space-y-3">
          {filteredConsistencies.length === 0 ? (
            <Card className="p-8"><EmptyState icon={AlertTriangle} title="No consistency issues" description="Brand consistency checks will appear here." /></Card>
          ) : (
            filteredConsistencies.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-sm text-fg-secondary">{c.detectedBy || 'Unknown'} · {c.detectedDate ? new Date(c.detectedDate).toLocaleDateString() : 'No date'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={severityVariant(c.severity)}>{c.severity}</Badge>
                    <Badge variant={consistencyStatusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
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
