'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Database, ShieldCheck, GitBranch, Users, Boxes,
  Search, BarChart3, CheckCircle, XCircle,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type CatalogEntryType = 'dataset' | 'table' | 'api' | 'report' | 'metric' | 'dashboard';
type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';
type CatalogEntryStatus = 'active' | 'deprecated' | 'archived' | 'draft';
type QualityRuleType = 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'uniqueness' | 'validity' | 'integrity';
type QualityRuleStatus = 'active' | 'inactive' | 'draft';
type QualityCheckResult = 'pass' | 'fail' | 'warning' | 'error';
type LineageStatus = 'active' | 'inactive' | 'deprecated';
type StewardRole = 'owner' | 'steward' | 'custodian' | 'consumer';
type StewardshipStatus = 'active' | 'inactive';
type MDMDomain = 'customer' | 'product' | 'employee' | 'vendor' | 'location' | 'asset' | 'other';
type MDMRecordStatus = 'active' | 'merged' | 'archived' | 'pending';

interface CatalogEntry {
  id: string;
  name: string;
  type: CatalogEntryType;
  source: string;
  owner: string;
  description: string;
  tags: string[];
  classification: DataClassification;
  pii: boolean;
  refreshFrequency: string;
  qualityScore: number | null;
  status: CatalogEntryStatus;
  createdAt: Date;
}

interface QualityRule {
  id: string;
  name: string;
  catalogEntryId: string | null;
  type: QualityRuleType;
  description: string;
  rule: string;
  threshold: number | null;
  frequency: string;
  status: QualityRuleStatus;
  lastRun: Date | null;
  lastResult: QualityCheckResult | null;
  violations: number;
  createdAt: Date;
}

interface Lineage {
  id: string;
  name: string;
  source: string;
  target: string;
  transformation: string;
  schedule: string;
  status: LineageStatus;
  dependencies: string[];
  dataVolume: string;
  lastUpdated: Date | null;
  createdAt: Date;
}

interface Stewardship {
  id: string;
  catalogEntryId: string | null;
  stewardName: string;
  role: StewardRole;
  responsibilities: string;
  accountability: string;
  accessLevel: string;
  status: StewardshipStatus;
  createdAt: Date;
}

interface MDMRecord {
  id: string;
  domain: MDMDomain;
  entityName: string;
  goldenRecord: Record<string, unknown>;
  sourceRecords: Array<{ source: string; recordId: string; matchScore?: number }>;
  status: MDMRecordStatus;
  qualityScore: number | null;
  lastVerified: Date | null;
  verifiedBy: string | null;
  createdAt: Date;
}

interface DataGovernanceMetrics {
  catalogCoverage: number;
  qualityRulePassRate: number;
  piiClassificationCoverage: number;
  mdmGoldenRecords: number;
  lineageCompleteness: number;
}

interface DataGovernanceStats {
  catalogCount: number;
  qualityRuleCount: number;
  lineageCount: number;
  stewardshipCount: number;
  mdmRecordCount: number;
  piiCount: number;
  activeCatalogCount: number;
  qualityRulePassRate: number;
  byCatalogType: Record<string, number>;
  byClassification: Record<string, number>;
  byMDMDomain: Record<string, number>;
}

interface DataGovernanceDashboardProps {
  organizationId: string;
  catalog: CatalogEntry[];
  qualityRules: QualityRule[];
  lineage: Lineage[];
  stewardship: Stewardship[];
  mdmRecords: MDMRecord[];
  metrics: DataGovernanceMetrics;
  stats: DataGovernanceStats;
}

// ── Helpers ──

const classificationVariant: Record<DataClassification, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  public: 'success',
  internal: 'info',
  confidential: 'warning',
  restricted: 'danger',
};

const catalogStatusVariant: Record<CatalogEntryStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  deprecated: 'warning',
  archived: 'default',
  draft: 'info',
};

const qualityRuleStatusVariant: Record<QualityRuleStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  draft: 'info',
};

const lineageStatusVariant: Record<LineageStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  deprecated: 'warning',
};

const stewardRoleVariant: Record<StewardRole, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  owner: 'accent',
  steward: 'info',
  custodian: 'warning',
  consumer: 'default',
};

const mdmStatusVariant: Record<MDMRecordStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  merged: 'info',
  archived: 'default',
  pending: 'warning',
};

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Component ──

type TabId = 'overview' | 'catalog' | 'quality_rules' | 'lineage' | 'stewardship' | 'mdm';

export function DataGovernanceDashboard({
  organizationId: _organizationId,
  catalog,
  qualityRules,
  lineage,
  stewardship,
  mdmRecords,
  metrics,
  stats,
}: DataGovernanceDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const catalogName = useCallback((id: string | null) => (id ? catalog.find((c) => c.id === id)?.name || id : '—'), [catalog]);

  const filteredCatalog = useMemo(() => {
    if (!search) return catalog;
    const q = search.toLowerCase();
    return catalog.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.owner.toLowerCase().includes(q) || c.classification.toLowerCase().includes(q),
    );
  }, [catalog, search]);

  const filteredQualityRules = useMemo(() => {
    if (!search) return qualityRules;
    const q = search.toLowerCase();
    return qualityRules.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [qualityRules, search]);

  const filteredLineage = useMemo(() => {
    if (!search) return lineage;
    const q = search.toLowerCase();
    return lineage.filter(
      (l) => l.name.toLowerCase().includes(q) || l.source.toLowerCase().includes(q) || l.target.toLowerCase().includes(q),
    );
  }, [lineage, search]);

  const filteredStewardship = useMemo(() => {
    if (!search) return stewardship;
    const q = search.toLowerCase();
    return stewardship.filter(
      (s) => s.stewardName.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [stewardship, search]);

  const filteredMDM = useMemo(() => {
    if (!search) return mdmRecords;
    const q = search.toLowerCase();
    return mdmRecords.filter(
      (m) => m.entityName.toLowerCase().includes(q) || m.domain.toLowerCase().includes(q) || m.status.toLowerCase().includes(q),
    );
  }, [mdmRecords, search]);

  const tabs: { id: TabId; label: string; icon: typeof Database }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'catalog', label: 'Catalog', icon: Database },
    { id: 'quality_rules', label: 'Quality Rules', icon: ShieldCheck },
    { id: 'lineage', label: 'Lineage', icon: GitBranch },
    { id: 'stewardship', label: 'Stewardship', icon: Users },
    { id: 'mdm', label: 'MDM', icon: Boxes },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Catalog</span>
          </div>
          <p className="text-2xl font-semibold">{stats.catalogCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeCatalogCount} active · {stats.piiCount} PII</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Quality Rules</span>
          </div>
          <p className="text-2xl font-semibold">{stats.qualityRuleCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.qualityRulePassRate}% pass rate</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Lineage</span>
          </div>
          <p className="text-2xl font-semibold">{stats.lineageCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.stewardshipCount} stewards</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Boxes className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">MDM Records</span>
          </div>
          <p className="text-2xl font-semibold">{stats.mdmRecordCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{metrics.mdmGoldenRecords} golden</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-alt text-fg-secondary hover:text-fg-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      {tab !== 'overview' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>
      )}

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Governance Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Catalog coverage</span>
                  <span className="font-medium">{metrics.catalogCoverage}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Quality rule pass rate</span>
                  <span className="font-medium">{metrics.qualityRulePassRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">PII classification coverage</span>
                  <span className="font-medium">{metrics.piiClassificationCoverage}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">MDM golden records</span>
                  <span className="font-medium">{metrics.mdmGoldenRecords}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Lineage completeness</span>
                  <span>{metrics.lineageCompleteness}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Counts</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Catalog entries</span>
                  <span className="font-medium">{stats.catalogCount} ({stats.activeCatalogCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Quality rules</span>
                  <span className="font-medium">{stats.qualityRuleCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Lineage entries</span>
                  <span className="font-medium">{stats.lineageCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Stewardship assignments</span>
                  <span className="font-medium">{stats.stewardshipCount}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>MDM records</span>
                  <span>{stats.mdmRecordCount}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'catalog' && (
        <div className="space-y-4">
          {filteredCatalog.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Database} title="No catalog entries" description="Create a catalog entry to get started." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Owner</th>
                    <th className="p-3 font-medium">Classification</th>
                    <th className="p-3 font-medium">PII</th>
                    <th className="p-3 font-medium">Quality</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalog.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{entry.name}</td>
                      <td className="p-3">{entry.type}</td>
                      <td className="p-3">{entry.owner || '—'}</td>
                      <td className="p-3"><Badge variant={classificationVariant[entry.classification]}>{entry.classification}</Badge></td>
                      <td className="p-3">{entry.pii ? <span className="text-danger">Yes</span> : 'No'}</td>
                      <td className="p-3">{entry.qualityScore !== null ? `${entry.qualityScore}%` : '—'}</td>
                      <td className="p-3"><Badge variant={catalogStatusVariant[entry.status]}>{entry.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'quality_rules' && (
        <div className="space-y-4">
          {filteredQualityRules.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={ShieldCheck} title="No quality rules" description="Create a quality rule to see it here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Catalog</th>
                    <th className="p-3 font-medium">Last Run</th>
                    <th className="p-3 font-medium">Result</th>
                    <th className="p-3 font-medium">Violations</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQualityRules.map((rule) => (
                    <tr key={rule.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{rule.name}</td>
                      <td className="p-3">{rule.type}</td>
                      <td className="p-3">{catalogName(rule.catalogEntryId)}</td>
                      <td className="p-3">{formatDate(rule.lastRun)}</td>
                      <td className="p-3">
                        {rule.lastResult === 'pass' ? (
                          <span className="inline-flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-success" />{rule.lastResult}</span>
                        ) : rule.lastResult === 'fail' ? (
                          <span className="inline-flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-danger" />{rule.lastResult}</span>
                        ) : rule.lastResult ?? '—'}
                      </td>
                      <td className="p-3">{rule.violations}</td>
                      <td className="p-3"><Badge variant={qualityRuleStatusVariant[rule.status]}>{rule.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'lineage' && (
        <div className="space-y-4">
          {filteredLineage.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={GitBranch} title="No lineage entries" description="Create a lineage entry to see it here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Source</th>
                    <th className="p-3 font-medium">Target</th>
                    <th className="p-3 font-medium">Schedule</th>
                    <th className="p-3 font-medium">Last Updated</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLineage.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{l.name}</td>
                      <td className="p-3">{l.source}</td>
                      <td className="p-3">{l.target}</td>
                      <td className="p-3">{l.schedule || '—'}</td>
                      <td className="p-3">{formatDate(l.lastUpdated)}</td>
                      <td className="p-3"><Badge variant={lineageStatusVariant[l.status]}>{l.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'stewardship' && (
        <div className="space-y-4">
          {filteredStewardship.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Users} title="No stewardship assignments" description="Create a stewardship assignment to see it here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Steward</th>
                    <th className="p-3 font-medium">Role</th>
                    <th className="p-3 font-medium">Catalog Entry</th>
                    <th className="p-3 font-medium">Access Level</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStewardship.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{s.stewardName}</td>
                      <td className="p-3"><Badge variant={stewardRoleVariant[s.role]}>{s.role}</Badge></td>
                      <td className="p-3">{catalogName(s.catalogEntryId)}</td>
                      <td className="p-3">{s.accessLevel || '—'}</td>
                      <td className="p-3"><Badge variant={s.status === 'active' ? 'success' : 'default'}>{s.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'mdm' && (
        <div className="space-y-4">
          {filteredMDM.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Boxes} title="No MDM records" description="Create an MDM record to see it here." />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMDM.map((record) => (
                <Card key={record.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{record.entityName}</h3>
                      <p className="text-xs text-fg-secondary">{record.domain}</p>
                    </div>
                    <Badge variant={mdmStatusVariant[record.status]}>{record.status}</Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Source records</span>
                      <span className="font-medium">{record.sourceRecords.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Quality score</span>
                      <span className="font-medium">{record.qualityScore !== null ? `${record.qualityScore}%` : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Last verified</span>
                      <span className="font-medium">{formatDate(record.lastVerified)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
