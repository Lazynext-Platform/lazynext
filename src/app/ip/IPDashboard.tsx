'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Copyright, FileText, Scale, BadgeCheck, Lock,
  Search, BarChart3, CheckCircle, XCircle,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type IPAssetType = 'patent' | 'trademark' | 'copyright' | 'trade_secret' | 'design' | 'domain' | 'software' | 'other';
type IPAssetStatus = 'filed' | 'registered' | 'pending' | 'granted' | 'expired' | 'abandoned' | 'in_dispute';
type LicenseType = 'exclusive' | 'non_exclusive' | 'sole';
type LicenseStatus = 'active' | 'expired' | 'terminated' | 'suspended' | 'pending';
type DisputeType = 'infringement' | 'opposition' | 'invalidity' | 'ownership' | 'breach' | 'other';
type DisputeStatus = 'filed' | 'under_review' | 'resolved' | 'dismissed' | 'appealed';
type TrademarkStatus = 'filed' | 'registered' | 'pending' | 'opposed' | 'expired' | 'abandoned';
type TradeSecretCategory = 'technical' | 'commercial' | 'financial' | 'operational' | 'customer' | 'other';
type TradeSecretAccessLevel = 'restricted' | 'confidential' | 'top_secret';
type TradeSecretStatus = 'active' | 'deprecated' | 'compromised' | 'retired';

interface IPAsset {
  id: string;
  title: string;
  type: IPAssetType;
  status: IPAssetStatus;
  registrationNumber: string | null;
  filingDate: Date | null;
  grantDate: Date | null;
  expiryDate: Date | null;
  jurisdiction: string;
  inventor: string;
  owner: string;
  description: string;
  value: number | null;
  classification: string;
  tags: string[];
  notes: string;
  createdAt: Date;
}

interface IPLicense {
  id: string;
  assetId: string;
  licensee: string;
  type: LicenseType;
  territory: string;
  fieldOfUse: string;
  startDate: Date;
  endDate: Date | null;
  royaltyRate: number | null;
  minimumRoyalty: number | null;
  upfrontFee: number | null;
  status: LicenseStatus;
  terms: string;
  restrictions: string;
  signedDate: Date | null;
  createdAt: Date;
}

interface IPDispute {
  id: string;
  assetId: string | null;
  title: string;
  type: DisputeType;
  status: DisputeStatus;
  opposingParty: string;
  filedDate: Date | null;
  jurisdiction: string;
  description: string;
  claims: string[];
  evidence: string[];
  resolution: string;
  legalCosts: number | null;
  createdAt: Date;
}

interface Trademark {
  id: string;
  name: string;
  classes: string[];
  registrationNumber: string | null;
  filingDate: Date | null;
  registrationDate: Date | null;
  expiryDate: Date | null;
  jurisdiction: string;
  status: TrademarkStatus;
  owner: string;
  attorney: string;
  createdAt: Date;
}

interface TradeSecret {
  id: string;
  name: string;
  description: string;
  category: TradeSecretCategory;
  accessLevel: TradeSecretAccessLevel;
  owner: string;
  custodian: string;
  protectionMeasures: string[];
  value: number | null;
  lastReviewed: Date | null;
  status: TradeSecretStatus;
  createdAt: Date;
}

interface IPMetrics {
  portfolioValue: number;
  activeLicenses: number;
  royaltyIncome: number;
  pendingDisputes: number;
  expiringIP: number;
  byType: Record<string, number>;
}

interface IPStats {
  assetCount: number;
  licenseCount: number;
  disputeCount: number;
  trademarkCount: number;
  tradeSecretCount: number;
  activeLicenseCount: number;
  pendingDisputeCount: number;
  portfolioValue: number;
  royaltyIncome: number;
  byAssetType: Record<string, number>;
  byAssetStatus: Record<string, number>;
  byDisputeStatus: Record<string, number>;
}

interface IPDashboardProps {
  organizationId: string;
  workspaceId: string;
  assets: IPAsset[];
  licenses: IPLicense[];
  disputes: IPDispute[];
  trademarks: Trademark[];
  tradeSecrets: TradeSecret[];
  metrics: IPMetrics;
  stats: IPStats;
}

// ── Helpers ──

const assetStatusVariant: Record<IPAssetStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  filed: 'info',
  registered: 'success',
  pending: 'warning',
  granted: 'success',
  expired: 'danger',
  abandoned: 'default',
  in_dispute: 'danger',
};

const licenseStatusVariant: Record<LicenseStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  expired: 'warning',
  terminated: 'danger',
  suspended: 'warning',
  pending: 'info',
};

const disputeStatusVariant: Record<DisputeStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  filed: 'info',
  under_review: 'accent',
  resolved: 'success',
  dismissed: 'default',
  appealed: 'warning',
};

const trademarkStatusVariant: Record<TrademarkStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  filed: 'info',
  registered: 'success',
  pending: 'warning',
  opposed: 'danger',
  expired: 'danger',
  abandoned: 'default',
};

const accessLevelVariant: Record<TradeSecretAccessLevel, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  restricted: 'warning',
  confidential: 'info',
  top_secret: 'danger',
};

const tradeSecretStatusVariant: Record<TradeSecretStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  deprecated: 'warning',
  compromised: 'danger',
  retired: 'default',
};

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function formatCurrency(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return `$${v.toLocaleString()}`;
}

// ── Component ──

type TabId = 'overview' | 'assets' | 'licenses' | 'disputes' | 'trademarks' | 'trade_secrets';

export function IPDashboard({
  organizationId: _organizationId,
  workspaceId: _workspaceId,
  assets,
  licenses,
  disputes,
  trademarks,
  tradeSecrets,
  metrics,
  stats,
}: IPDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const assetTitle = useCallback((id: string) => assets.find((a) => a.id === id)?.title || id, [assets]);

  const filteredAssets = useMemo(() => {
    if (!search) return assets;
    const q = search.toLowerCase();
    return assets.filter(
      (a) => a.title.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.owner.toLowerCase().includes(q) || a.jurisdiction.toLowerCase().includes(q),
    );
  }, [assets, search]);

  const filteredLicenses = useMemo(() => {
    if (!search) return licenses;
    const q = search.toLowerCase();
    return licenses.filter(
      (l) => l.licensee.toLowerCase().includes(q) || l.type.toLowerCase().includes(q) || l.status.toLowerCase().includes(q),
    );
  }, [licenses, search]);

  const filteredDisputes = useMemo(() => {
    if (!search) return disputes;
    const q = search.toLowerCase();
    return disputes.filter(
      (d) => d.title.toLowerCase().includes(q) || d.opposingParty.toLowerCase().includes(q) || d.status.toLowerCase().includes(q),
    );
  }, [disputes, search]);

  const filteredTrademarks = useMemo(() => {
    if (!search) return trademarks;
    const q = search.toLowerCase();
    return trademarks.filter(
      (t) => t.name.toLowerCase().includes(q) || t.jurisdiction.toLowerCase().includes(q) || t.status.toLowerCase().includes(q),
    );
  }, [trademarks, search]);

  const filteredTradeSecrets = useMemo(() => {
    if (!search) return tradeSecrets;
    const q = search.toLowerCase();
    return tradeSecrets.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.owner.toLowerCase().includes(q),
    );
  }, [tradeSecrets, search]);

  const tabs: { id: TabId; label: string; icon: typeof Copyright }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'assets', label: 'Assets', icon: Copyright },
    { id: 'licenses', label: 'Licenses', icon: FileText },
    { id: 'disputes', label: 'Disputes', icon: Scale },
    { id: 'trademarks', label: 'Trademarks', icon: BadgeCheck },
    { id: 'trade_secrets', label: 'Trade Secrets', icon: Lock },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Copyright className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">IP Assets</span>
          </div>
          <p className="text-2xl font-semibold">{stats.assetCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{formatCurrency(stats.portfolioValue)} value</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Licenses</span>
          </div>
          <p className="text-2xl font-semibold">{stats.licenseCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeLicenseCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Disputes</span>
          </div>
          <p className="text-2xl font-semibold">{stats.disputeCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.pendingDisputeCount} pending</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Trademarks</span>
          </div>
          <p className="text-2xl font-semibold">{stats.trademarkCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.tradeSecretCount} trade secrets</p>
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
                <h2 className="heading-display text-lg">IP Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Portfolio value</span>
                  <span className="font-medium">{formatCurrency(metrics.portfolioValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Active licenses</span>
                  <span className="font-medium">{metrics.activeLicenses}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Royalty income (est.)</span>
                  <span className="font-medium">{formatCurrency(metrics.royaltyIncome)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Pending disputes</span>
                  <span className="font-medium">{metrics.pendingDisputes}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Expiring IP (180d)</span>
                  <span>{metrics.expiringIP}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Copyright className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Counts</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Assets</span>
                  <span className="font-medium">{stats.assetCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Licenses</span>
                  <span className="font-medium">{stats.licenseCount} ({stats.activeLicenseCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Disputes</span>
                  <span className="font-medium">{stats.disputeCount} ({stats.pendingDisputeCount} pending)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Trademarks</span>
                  <span className="font-medium">{stats.trademarkCount}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Trade secrets</span>
                  <span>{stats.tradeSecretCount}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Pending Disputes</h3>
            {disputes.filter((d) => d.status === 'filed' || d.status === 'under_review' || d.status === 'appealed').length === 0 ? (
              <p className="text-sm text-fg-secondary">No pending disputes.</p>
            ) : (
              <div className="space-y-2">
                {disputes.filter((d) => d.status === 'filed' || d.status === 'under_review' || d.status === 'appealed').slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{d.title}</p>
                      <p className="text-xs text-fg-secondary">{d.opposingParty || 'Unknown party'} · {d.type}</p>
                    </div>
                    <Badge variant={disputeStatusVariant[d.status]}>{d.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'assets' && (
        <div className="space-y-4">
          {filteredAssets.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Copyright} title="No IP assets" description="Create an IP asset to get started." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Owner</th>
                    <th className="p-3 font-medium">Jurisdiction</th>
                    <th className="p-3 font-medium">Value</th>
                    <th className="p-3 font-medium">Expiry</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{asset.title}</td>
                      <td className="p-3">{asset.type}</td>
                      <td className="p-3">{asset.owner || '—'}</td>
                      <td className="p-3">{asset.jurisdiction || '—'}</td>
                      <td className="p-3">{formatCurrency(asset.value)}</td>
                      <td className="p-3">{formatDate(asset.expiryDate)}</td>
                      <td className="p-3"><Badge variant={assetStatusVariant[asset.status]}>{asset.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'licenses' && (
        <div className="space-y-4">
          {filteredLicenses.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={FileText} title="No licenses" description="Create a license to see it here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Licensee</th>
                    <th className="p-3 font-medium">Asset</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Territory</th>
                    <th className="p-3 font-medium">Start</th>
                    <th className="p-3 font-medium">End</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLicenses.map((license) => (
                    <tr key={license.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{license.licensee}</td>
                      <td className="p-3">{assetTitle(license.assetId)}</td>
                      <td className="p-3">{license.type}</td>
                      <td className="p-3">{license.territory || '—'}</td>
                      <td className="p-3">{formatDate(license.startDate)}</td>
                      <td className="p-3">{formatDate(license.endDate)}</td>
                      <td className="p-3"><Badge variant={licenseStatusVariant[license.status]}>{license.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'disputes' && (
        <div className="space-y-4">
          {filteredDisputes.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Scale} title="No disputes" description="Create a dispute to see it here." />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredDisputes.map((dispute) => (
                <Card key={dispute.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{dispute.title}</h3>
                      <p className="text-xs text-fg-secondary">{dispute.type} · {dispute.opposingParty || 'Unknown'}</p>
                    </div>
                    <Badge variant={disputeStatusVariant[dispute.status]}>{dispute.status}</Badge>
                  </div>
                  {dispute.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{dispute.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Filed</span>
                      <span className="font-medium">{formatDate(dispute.filedDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Jurisdiction</span>
                      <span className="font-medium">{dispute.jurisdiction || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Legal costs</span>
                      <span className="font-medium">{formatCurrency(dispute.legalCosts)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'trademarks' && (
        <div className="space-y-4">
          {filteredTrademarks.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={BadgeCheck} title="No trademarks" description="Create a trademark to see it here." />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTrademarks.map((tm) => (
                <Card key={tm.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{tm.name}</h3>
                      <p className="text-xs text-fg-secondary">{tm.jurisdiction || '—'}</p>
                    </div>
                    <Badge variant={trademarkStatusVariant[tm.status]}>{tm.status}</Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Classes</span>
                      <span className="font-medium">{tm.classes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Reg. number</span>
                      <span className="font-medium">{tm.registrationNumber || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Expiry</span>
                      <span className="font-medium">{formatDate(tm.expiryDate)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'trade_secrets' && (
        <div className="space-y-4">
          {filteredTradeSecrets.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Lock} title="No trade secrets" description="Create a trade secret to see it here." />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTradeSecrets.map((secret) => (
                <Card key={secret.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{secret.name}</h3>
                      <p className="text-xs text-fg-secondary">{secret.category}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={accessLevelVariant[secret.accessLevel]}>{secret.accessLevel}</Badge>
                      <Badge variant={tradeSecretStatusVariant[secret.status]}>{secret.status}</Badge>
                    </div>
                  </div>
                  {secret.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{secret.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Owner</span>
                      <span className="font-medium">{secret.owner || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Custodian</span>
                      <span className="font-medium">{secret.custodian || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Last reviewed</span>
                      <span className="font-medium">{formatDate(secret.lastReviewed)}</span>
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
