import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PresenceService } from '@/lib/services/presence-service';

/**
 * GET /api/presence/activity — get activity feed for an organization.
 * Query: workspaceId, userId, limit, offset, types (comma-separated)
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || undefined;
  const workspaceId = sp.get('workspaceId') || undefined;
  const userId = sp.get('userId') || undefined;
  const limitParam = sp.get('limit');
  const offsetParam = sp.get('offset');
  const typesParam = sp.get('types');

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;
  const types = typesParam ? typesParam.split(',').map((t) => t.trim()).filter(Boolean) : undefined;

  try {
    const activity = await PresenceService.getActivityFeed(organizationId, {
      workspaceId,
      userId,
      limit,
      offset,
      types,
    });
    return NextResponse.json({ activity });
  } catch (e) {
    console.error('[presence] activity error:', e);
    return NextResponse.json({ error: 'failed_to_get_activity' }, { status: 500 });
  }
}
