import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/files/upload — upload a file to the workspace.
 * Accepts multipart/form-data with a single file field.
 * Stores metadata in FileStore and returns the record.
 * The actual binary storage is handled by the media storage layer.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const workspaceId = formData.get('workspaceId') as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'no_file' }, { status: 400 });
    }

    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces.find((w) => w.id === workspaceId) || workspaces[0];

    // Generate a storage key
    const storageKey = `files/${workspace.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Store file metadata. In production with R2, the binary would be uploaded
    // to R2 here. For now, we record the metadata.
    const fileRecord = await prisma.fileStore.create({
      data: {
        workspaceId: workspace.id,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        storageKey,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ file: fileRecord }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'upload_failed' },
      { status: 500 },
    );
  }
}
