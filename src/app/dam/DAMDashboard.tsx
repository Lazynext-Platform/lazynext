'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  FileImage, FolderOpen, GitBranch, Lock,
  Search, BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  DigitalAsset, AssetCollection, AssetVersion, AssetPermission,
  DAMMetrics, DAMStats,
  AssetStatus, PermissionLevel,
} from '@/lib/services/dam-service';

type TabId = 'overview' | 'assets' | 'collections' | 'versions' | 'permissions';

interface DAMDashboardProps {
  organizationId: string;
  assets: DigitalAsset[];
  collections: AssetCollection[];
  versions: AssetVersion[];
  permissions: AssetPermission[];
  metrics: DAMMetrics;
  stats: DAMStats;
}

const assetStatusVariant = (status: AssetStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'active') return 'success';
  if (status === 'pending_review') return 'warning';
  if (status === 'archived') return 'default';
  if (status === 'deleted') return 'danger';
  if (status === 'restricted') return 'danger';
  return 'info';
};

const permissionLevelVariant = (level: PermissionLevel): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (level === 'public') return 'success';
  if (level === 'internal') return 'info';
  if (level === 'restricted') return 'warning';
  if (level === 'confidential') return 'danger';
  return 'default';
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function DAMDashboard({
  assets, collections, versions, permissions, metrics, stats,
}: DAMDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const assetName = useCallback(
    (id: string) => assets.find((a) => a.id === id)?.name || id,
    [assets],
  );

  const filteredAssets = useMemo(() => {
    if (!search) return assets;
    const q = search.toLowerCase();
    return assets.filter(
      (a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [assets, search]);

  const filteredCollections = useMemo(() => {
    if (!search) return collections;
    const q = search.toLowerCase();
    return collections.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [collections, search]);

  const filteredVersions = useMemo(() => {
    if (!search) return versions;
    const q = search.toLowerCase();
    return versions.filter(
      (v) => v.version.toLowerCase().includes(q) || assetName(v.assetId).toLowerCase().includes(q) || v.uploadedBy.toLowerCase().includes(q),
    );
  }, [versions, search, assetName]);

  const filteredPermissions = useMemo(() => {
    if (!search) return permissions;
    const q = search.toLowerCase();
    return permissions.filter(
      (p) => p.type.toLowerCase().includes(q) || p.level.toLowerCase().includes(q) || p.grantedTo.toLowerCase().includes(q),
    );
  }, [permissions, search]);

  const tabs: { id: TabId; label: string; icon: typeof FileImage }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'assets', label: 'Assets', icon: FileImage },
    { id: 'collections', label: 'Collections', icon: FolderOpen },
    { id: 'versions', label: 'Versions', icon: GitBranch },
    { id: 'permissions', label: 'Permissions', icon: Lock },
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
              <div className="text-xs text-fg-tertiary">Total Assets</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalAssets}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Assets</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeAssets}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Collections</div>
              <div className="mt-1 text-2xl font-bold">{metrics.collections}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Storage Used</div>
              <div className="mt-1 text-2xl font-bold">{formatBytes(metrics.storageUsed)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Restricted Assets</div>
              <div className="mt-1 text-2xl font-bold">{metrics.restrictedAssets}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Asset Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAssetType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Asset Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAssetStatus).map(([status, count]) => (
                <Badge key={status} variant={assetStatusVariant(status as AssetStatus)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Collection Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCollectionType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Permission Level Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byPermissionLevel).map(([level, count]) => (
                <Badge key={level} variant={permissionLevelVariant(level as PermissionLevel)}>{level}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'assets' && (
        <div className="space-y-3">
          {filteredAssets.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileImage} title="No assets" description="Digital assets will appear here." /></Card>
          ) : (
            filteredAssets.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.owner || 'Unassigned'}{a.fileSize > 0 ? ` · ${formatBytes(a.fileSize)}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.tags.length > 0 && <Badge variant="default">{a.tags.length} tags</Badge>}
                    <Badge variant={assetStatusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'collections' && (
        <div className="space-y-3">
          {filteredCollections.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FolderOpen} title="No collections" description="Asset collections will appear here." /></Card>
          ) : (
            filteredCollections.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.assetIds.length} assets · {c.owner || 'Unassigned'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.color && <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />}
                    <Badge variant={assetStatusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'versions' && (
        <div className="space-y-3">
          {filteredVersions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={GitBranch} title="No versions" description="Asset versions will appear here." /></Card>
          ) : (
            filteredVersions.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">v{v.version}</div>
                    <div className="text-sm text-fg-secondary">{assetName(v.assetId)} · {v.uploadedBy || 'Unknown'}{v.fileSize > 0 ? ` · ${formatBytes(v.fileSize)}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.changeLog && <Badge variant="default">changelog</Badge>}
                    <Badge variant="info">{v.version}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'permissions' && (
        <div className="space-y-3">
          {filteredPermissions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Lock} title="No permissions" description="Asset permissions will appear here." /></Card>
          ) : (
            filteredPermissions.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.type} · {p.level}</div>
                    <div className="text-sm text-fg-secondary">{p.grantedTo || 'Anyone'} · {p.grantedBy || 'System'}{p.expiresDate ? ` · expires ${new Date(p.expiresDate).toLocaleDateString()}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={permissionLevelVariant(p.level)}>{p.level}</Badge>
                    <Badge variant="default">{p.type}</Badge>
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
