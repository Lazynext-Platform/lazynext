import type { Metadata } from 'next';
import { Database } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Data Management — Lazynext',
  description: 'Data export, backup, migration, lineage, and GDPR privacy controls.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataExportService } from '@/lib/services/data-export-service';
import { BackupService } from '@/lib/services/backup-service';
import { MigrationService } from '@/lib/services/migration-service';
import { DataLineageService } from '@/lib/services/data-lineage-service';
import { GdprService } from '@/lib/services/gdpr-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { DataManagement } from './DataManagement';

export const dynamic = 'force-dynamic';

export default async function DataManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Data Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Export, backup, migrate, and manage your data privacy.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Database}
            title="No workspace yet"
            description="Create a company first to access data management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const ws = workspaces[0];

  const [exports, backups, migrations, lineageStats, exportStats, backupStats, migrationStats, gdprStats, entities, schedule, retention] = await Promise.all([
    DataExportService.listExports(ws.id),
    BackupService.listBackups(ws.id),
    MigrationService.listMigrations(ws.id),
    DataLineageService.getStats(ws.id),
    DataExportService.getExportStats(ws.id),
    BackupService.getBackupStats(ws.id),
    MigrationService.getStats(ws.id),
    GdprService.getStats(),
    DataExportService.getExportableEntities(ws.id),
    BackupService.getSchedule(ws.id),
    BackupService.getRetentionPolicy(ws.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Data Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Export, backup, migrate, and manage your data privacy.</p>
      </div>

      <DataManagement
        workspaceId={ws.id}
        organizationId={ws.organizationId}
        exports={exports}
        backups={backups}
        migrations={migrations}
        lineageStats={lineageStats}
        exportStats={exportStats}
        backupStats={backupStats}
        migrationStats={migrationStats}
        gdprStats={gdprStats}
        entities={entities}
        schedule={schedule}
        retention={retention}
      />
    </div>
  );
}
