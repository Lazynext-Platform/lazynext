import { Folder } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { FileUploader } from '@/components/FileUploader';

export const dynamic = 'force-dynamic';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function FilesPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const workspace = workspaces[0] || await WorkspaceService.ensureDefaultWorkspace(session.user.id, session.user.name);

  const files = await prisma.fileStore.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl">Files</h1>
          <p className="text-sm text-fg-secondary mt-1">{files.length} file{files.length !== 1 ? 's' : ''}</p>
        </div>
        <FileUploader workspaceId={workspace.id} />
      </div>

      {files.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Folder}
            title="No files yet"
            description="Upload files to store and share them within your workspace."
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2" style={{ borderColor: 'var(--c-ink)' }}>
                <th className="label-mono text-left px-4 py-3">Name</th>
                <th className="label-mono text-left px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="label-mono text-left px-4 py-3 hidden md:table-cell">Size</th>
                <th className="label-mono text-left px-4 py-3 hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-b-2 last:border-0 hover:bg-hover transition-colors" style={{ borderColor: 'var(--c-ink)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-fg-muted shrink-0" />
                      <span className="font-medium truncate">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell"><Badge>{file.mimeType}</Badge></td>
                  <td className="px-4 py-3 hidden md:table-cell text-fg-secondary">{formatSize(file.size)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-fg-secondary">{file.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
