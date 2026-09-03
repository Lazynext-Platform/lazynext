import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { canUploadFile } from '@/lib/plan-guard';
import { putMedia } from '@/lib/media-storage';

/** MIME types that are blocked from upload to prevent stored XSS. */
const BLOCKED_MIME_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'application/ecmascript',
  'text/ecmascript',
  'image/svg+xml', // SVG can contain scripts
]);

/** File extensions that are blocked from upload. */
const BLOCKED_EXTENSIONS = /\.(html?|xhtml|js|mjs|svg|exe|bat|cmd|sh|php|jsp|asp|aspx)$/i;

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

/**
 * POST /api/files/upload — upload a file to the workspace.
 * Accepts multipart/form-data with a single file field.
 * Stores the binary in R2 (prod) or local filesystem (dev) and
 * records metadata in the FileStore table.
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

    // File size limit
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
    }

    // Block dangerous file types to prevent stored XSS
    const mimeType = file.type || 'application/octet-stream';
    if (BLOCKED_MIME_TYPES.has(mimeType) || BLOCKED_EXTENSIONS.test(file.name)) {
      return NextResponse.json({ error: 'file_type_not_allowed' }, { status: 415 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }
    const workspace = workspaces.find((w) => w.id === workspaceId) || workspaces[0];

    // Plan limit check (file size + count)
    const guard = await canUploadFile(workspace.id, session.user.id, file.size);
    if (!guard.ok) {
      return NextResponse.json(
        { error: guard.reason || 'plan_limit_exceeded', limit: guard.limit, current: guard.current, tier: guard.tier },
        { status: 402 },
      );
    }

    // Generate a storage key
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `files/${workspace.id}/${Date.now()}-${safeName}`;

    // Upload binary to R2 (prod) or local filesystem (dev)
    const arrayBuffer = await file.arrayBuffer();
    const mediaUrl = await putMedia(storageKey, arrayBuffer, file.type || 'application/octet-stream');

    // Store file metadata in the database
    const fileRecord = await prisma.fileStore.create({
      data: {
        workspaceId: workspace.id,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        storageKey: mediaUrl, // store the URL returned by putMedia
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ file: fileRecord }, { status: 201 });
  } catch (e) {
    console.error('[files/upload] error:', e);
    return NextResponse.json(
      { error: 'upload_failed' },
      { status: 500 },
    );
  }
}
