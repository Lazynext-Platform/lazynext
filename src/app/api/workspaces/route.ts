import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';

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
