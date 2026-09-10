import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ModerationService } from '@/lib/services/moderation-service';

/** GET /api/team/moderation/flags — list flagged messages */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ flags: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const flags = await ModerationService.getFlags(organizationId, {
    status: (sp.get('status') as 'pending' | 'resolved') || undefined,
    severity: (sp.get('severity') as 'low' | 'medium' | 'high') || undefined,
  });

  return NextResponse.json({ flags });
}
