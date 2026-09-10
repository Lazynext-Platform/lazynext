'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download, HardDrive, ArrowRightLeft, GitBranch, ShieldCheck,
  Plus, Trash2, Play, Calendar, Clock, FileText, CheckCircle2,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

interface ExportRecord {
  id: string; format: string; entities: string[]; status: string;
  recordCount: number; sizeBytes: number; createdAt: Date;
}
interface BackupRecord {
  id: string; type: string; entities: string[]; status: string;
  sizeBytes: number; recordCount: number; createdAt: Date;
}
interface MigrationRecord {
  id: string; name: string; sourceType: string; targetType: string;
  status: string; migratedCount: number; createdAt: Date;
}
interface EntityInfo {
  name: string; label: string; count: number;
}
interface ScheduleConfig {
  frequency: string; type: string; enabled: boolean; nextRunAt: string | null;
}
interface RetentionPolicy {
  maxBackups: number; retentionDays: number; minKeep: number;
}
interface LineageStats {
  totalRecords: number;
  bySourceEntity: Record<string, number>;
  byTargetEntity: Record<string, number>;
  byTransformation: Record<string, number>;
}
interface ExportStats {
  total: number; completed: number; totalSizeBytes: number;
}
interface BackupStats {
  total: number; completed: number; totalSizeBytes: number; scheduled: boolean; lastBackupAt: Date | null;
}
interface MigrationStats {
  total: number; completed: number; totalMigrated: number;
}
interface GdprStats {
  totalRequests: number; pendingRequests: number; completedRequests: number;
  rejectedRequests: number; totalExports: number; totalDeletions: number;
  consentRecords: number;
}

type Tab = 'overview' | 'export' | 'backup' | 'migration' | 'lineage' | 'gdpr';

export function DataManagement({
  workspaceId,
  organizationId,
  exports: initialExports,
  backups: initialBackups,
  migrations: initialMigrations,
  lineageStats,
  exportStats,
  backupStats,
  migrationStats,
  gdprStats,
  entities,
  schedule,
  retention,
}: {
  workspaceId: string;
  organizationId: string;
  exports: ExportRecord[];
  backups: BackupRecord[];
  migrations: MigrationRecord[];
  lineageStats: LineageStats;
  exportStats: ExportStats;
  backupStats: BackupStats;
  migrationStats: MigrationStats;
  gdprStats: GdprStats;
  entities: EntityInfo[];
  schedule: ScheduleConfig | null;
  retention: RetentionPolicy;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [exports] = useState(initialExports);
  const [backups] = useState(initialBackups);
  const [migrations] = useState(initialMigrations);
  const [loading, setLoading] = useState(false);

  const tabs: Array<{ id: Tab; label: string; icon: typeof Download }> = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'backup', label: 'Backup', icon: HardDrive },
    { id: 'migration', label: 'Migration', icon: ArrowRightLeft },
    { id: 'lineage', label: 'Lineage', icon: GitBranch },
    { id: 'gdpr', label: 'GDPR / Privacy', icon: ShieldCheck },
  ];

  async function handleCreateExport() {
    setLoading(true);
    try {
      await fetch('/api/data/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'json', entities: ['task', 'project', 'goal'] }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBackup() {
    setLoading(true);
    try {
      await fetch('/api/data/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'full' }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleRunExport(id: string) {
    setLoading(true);
    try {
      await fetch(`/api/data/export/${id}/run`, { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteExport(id: string) {
    await fetch(`/api/data/export/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  async function handleDeleteBackup(id: string) {
    await fetch(`/api/data/backup/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  async function handleRestoreBackup(id: string) {
    await fetch(`/api/data/backup/${id}/restore`, { method: 'POST' });
  }

  async function handleExecuteMigration(id: string) {
    setLoading(true);
    try {
      await fetch(`/api/data/migration/${id}/execute`, { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    completed: 'success', pending: 'warning', failed: 'danger',
    draft: 'default', validated: 'info', in_progress: 'warning',
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 border-b border-fg-muted/20 pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <Button
              key={t.id}
              variant={tab === t.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTab(t.id)}
              className="text-xs"
            >
              <Icon className="h-3 w-3" /> {t.label}
            </Button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Exports</div>
              <div className="text-2xl font-bold">{exportStats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Backups</div>
              <div className="text-2xl font-bold">{backupStats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Migrations</div>
              <div className="text-2xl font-bold">{migrationStats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Lineage Records</div>
              <div className="text-2xl font-bold">{lineageStats.totalRecords}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">GDPR Requests</div>
              <div className="text-2xl font-bold">{gdprStats.totalRequests}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Storage Used</div>
              <div className="text-2xl font-bold">{formatBytes(exportStats.totalSizeBytes + backupStats.totalSizeBytes)}</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Download className="h-4 w-4 text-accent-primary" />
                <h3 className="text-sm font-medium">Recent Exports</h3>
              </div>
              <div className="space-y-2">
                {exports.slice(0, 3).map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-xs">
                    <span className="uppercase">{e.format}</span>
                    <Badge variant={statusVariant[e.status] || 'default'} className="text-xs">{e.status}</Badge>
                  </div>
                ))}
                {exports.length === 0 && <div className="text-xs text-fg-secondary">No exports yet.</div>}
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="h-4 w-4 text-accent-primary" />
                <h3 className="text-sm font-medium">Recent Backups</h3>
              </div>
              <div className="space-y-2">
                {backups.slice(0, 3).map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-xs">
                    <span className="capitalize">{b.type}</span>
                    <Badge variant={statusVariant[b.status] || 'default'} className="text-xs">{b.status}</Badge>
                  </div>
                ))}
                {backups.length === 0 && <div className="text-xs text-fg-secondary">No backups yet.</div>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Export Tab */}
      {tab === 'export' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-accent-primary" />
              <h2 className="heading-display text-sm">Data Exports</h2>
              <Badge variant="default" className="text-xs">{exports.length}</Badge>
            </div>
            <Button variant="primary" size="sm" onClick={handleCreateExport} disabled={loading}>
              <Plus className="h-4 w-4" /> New Export
            </Button>
          </div>

          <Card className="p-4">
            <h3 className="text-xs font-medium mb-2 text-fg-secondary">Exportable Entities</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {entities.map((e) => (
                <div key={e.name} className="flex items-center justify-between text-xs border border-fg-muted/20 rounded px-2 py-1">
                  <span>{e.label}</span>
                  <Badge variant="default" className="text-xs">{e.count}</Badge>
                </div>
              ))}
            </div>
          </Card>

          {exports.length === 0 ? (
            <Card className="p-6"><div className="text-sm text-fg-secondary">No exports yet. Click &quot;New Export&quot; to create one.</div></Card>
          ) : (
            <div className="space-y-2">
              {exports.map((e) => (
                <Card key={e.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="info" className="text-xs uppercase">{e.format}</Badge>
                    <span className="text-xs text-fg-secondary">{e.entities.length} entities</span>
                    <span className="text-xs text-fg-secondary">{e.recordCount} records</span>
                    <span className="text-xs text-fg-secondary">{formatBytes(e.sizeBytes)}</span>
                    <Badge variant={statusVariant[e.status] || 'default'} className="text-xs">{e.status}</Badge>
                  </div>
                  <div className="flex gap-1">
                    {e.status === 'pending' && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleRunExport(e.id)}>
                        <Play className="h-3 w-3" /> Run
                      </Button>
                    )}
                    {e.status === 'completed' && (
                      <Button variant="ghost" size="sm" className="text-xs" href={`/api/data/export/${e.id}/download`}>
                        <Download className="h-3 w-3" /> Download
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleDeleteExport(e.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Backup Tab */}
      {tab === 'backup' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-accent-primary" />
              <h2 className="heading-display text-sm">Backups</h2>
              <Badge variant="default" className="text-xs">{backups.length}</Badge>
            </div>
            <Button variant="primary" size="sm" onClick={handleCreateBackup} disabled={loading}>
              <Plus className="h-4 w-4" /> New Backup
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-3 w-3 text-fg-secondary" />
                <span className="text-xs font-medium">Schedule</span>
              </div>
              <div className="text-xs text-fg-secondary">
                {schedule ? (
                  <div className="space-y-1">
                    <div>Frequency: <span className="capitalize">{schedule.frequency}</span></div>
                    <div>Type: <span className="capitalize">{schedule.type}</span></div>
                    <div>Enabled: {schedule.enabled ? 'Yes' : 'No'}</div>
                    {schedule.nextRunAt && <div>Next: {new Date(schedule.nextRunAt).toLocaleDateString()}</div>}
                  </div>
                ) : (
                  <div>No schedule configured.</div>
                )}
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3 w-3 text-fg-secondary" />
                <span className="text-xs font-medium">Retention</span>
              </div>
              <div className="text-xs text-fg-secondary space-y-1">
                <div>Max backups: {retention.maxBackups}</div>
                <div>Retention: {retention.retentionDays} days</div>
                <div>Min keep: {retention.minKeep}</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-3 w-3 text-fg-secondary" />
                <span className="text-xs font-medium">Stats</span>
              </div>
              <div className="text-xs text-fg-secondary space-y-1">
                <div>Completed: {backupStats.completed}</div>
                <div>Total size: {formatBytes(backupStats.totalSizeBytes)}</div>
                <div>Scheduled: {backupStats.scheduled ? 'Yes' : 'No'}</div>
              </div>
            </Card>
          </div>

          {backups.length === 0 ? (
            <Card className="p-6"><div className="text-sm text-fg-secondary">No backups yet. Click &quot;New Backup&quot; to create one.</div></Card>
          ) : (
            <div className="space-y-2">
              {backups.map((b) => (
                <Card key={b.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="info" className="text-xs capitalize">{b.type}</Badge>
                    <span className="text-xs text-fg-secondary">{b.entities.length} entities</span>
                    <span className="text-xs text-fg-secondary">{b.recordCount} records</span>
                    <span className="text-xs text-fg-secondary">{formatBytes(b.sizeBytes)}</span>
                    <Badge variant={statusVariant[b.status] || 'default'} className="text-xs">{b.status}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleRestoreBackup(b.id)}>
                      Restore
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleDeleteBackup(b.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Migration Tab */}
      {tab === 'migration' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Data Migrations</h2>
            <Badge variant="default" className="text-xs">{migrations.length}</Badge>
          </div>

          {migrations.length === 0 ? (
            <Card className="p-6"><div className="text-sm text-fg-secondary">No migration plans yet.</div></Card>
          ) : (
            <div className="space-y-2">
              {migrations.map((m) => (
                <Card key={m.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="text-xs text-fg-secondary">{m.sourceType} → {m.targetType}</span>
                    <span className="text-xs text-fg-secondary">{m.migratedCount} migrated</span>
                    <Badge variant={statusVariant[m.status] || 'default'} className="text-xs">{m.status}</Badge>
                  </div>
                  <div className="flex gap-1">
                    {(m.status === 'draft' || m.status === 'validated') && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleExecuteMigration(m.id)}>
                        <Play className="h-3 w-3" /> Execute
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lineage Tab */}
      {tab === 'lineage' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Data Lineage</h2>
            <Badge variant="default" className="text-xs">{lineageStats.totalRecords}</Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="p-4">
              <h3 className="text-xs font-medium mb-2 text-fg-secondary">By Source Entity</h3>
              <div className="space-y-1">
                {Object.entries(lineageStats.bySourceEntity || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="capitalize">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
                {Object.keys(lineageStats.bySourceEntity || {}).length === 0 && (
                  <div className="text-xs text-fg-secondary">No lineage records.</div>
                )}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-xs font-medium mb-2 text-fg-secondary">By Transformation</h3>
              <div className="space-y-1">
                {Object.entries(lineageStats.byTransformation || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span>{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
                {Object.keys(lineageStats.byTransformation || {}).length === 0 && (
                  <div className="text-xs text-fg-secondary">No transformations recorded.</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* GDPR Tab */}
      {tab === 'gdpr' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">GDPR / Privacy</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Total Requests</div>
              <div className="text-2xl font-bold">{gdprStats.totalRequests}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Pending</div>
              <div className="text-2xl font-bold">{gdprStats.pendingRequests}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Consent Records</div>
              <div className="text-2xl font-bold">{gdprStats.consentRecords}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary mb-1">Deletions</div>
              <div className="text-2xl font-bold">{gdprStats.totalDeletions}</div>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Data Subject Rights</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="secondary" size="sm" onClick={() => fetch('/api/data/gdpr/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })}>
                <Download className="h-4 w-4" /> Export My Data
              </Button>
              <Button variant="secondary" size="sm" onClick={() => fetch('/api/data/gdpr/anonymize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })}>
                <ShieldCheck className="h-4 w-4" /> Anonymize My Data
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
