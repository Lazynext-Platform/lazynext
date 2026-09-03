import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // Ensure user has a default workspace
    await WorkspaceService.ensureDefaultWorkspace(session.user.id, session.user.name);
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    return NextResponse.json({ workspaces });
  } catch (e) {
    return NextResponse.json(
      { error: 'failed_to_list_workspaces' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/workspaces — update workspace settings (name, locale, timezone).
 * Only owner/admin can update.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { id?: string; name?: string; defaultLocale?: string; timezone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 });
  }

  // Verify user is owner/admin of this workspace
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const ws = workspaces.find((w) => w.id === body.id);
  if (!ws) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (ws.role !== 'owner' && ws.role !== 'admin') {
    return NextResponse.json({ error: 'insufficient_permissions' }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (body.name?.trim()) data.name = body.name.trim();
  if (body.defaultLocale) data.defaultLocale = body.defaultLocale;
  if (body.timezone) data.timezone = body.timezone;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
  }

  const updated = await prisma.workspace.update({
    where: { id: body.id },
    data,
  });

  return NextResponse.json({ workspace: updated });
}
