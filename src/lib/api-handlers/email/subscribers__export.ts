import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SubscriberService } from '@/lib/services/subscriber-service';

/** GET /api/email/subscribers/export — export subscribers as CSV */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return new NextResponse('id,email,firstName,lastName,status,tags,subscribedAt\n', {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="subscribers.csv"' },
    });
  }

  const { searchParams } = new URL(req.url);
  const listId = searchParams.get('listId') || undefined;
  const status = searchParams.get('status') || undefined;

  const csv = await SubscriberService.exportSubscribers(workspaces[0].id, { listId, status });
  return new NextResponse(csv, {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="subscribers.csv"' },
  });
}
