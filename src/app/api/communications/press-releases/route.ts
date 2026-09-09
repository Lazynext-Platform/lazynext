import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CommunicationsService } from '@/lib/services/communications-service';

/** GET /api/communications/press-releases — list press releases */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ pressReleases: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { status?: string; author?: string } = {};
  const status = url.searchParams.get('status');
  const author = url.searchParams.get('author');
  if (status) opts.status = status;
  if (author) opts.author = author;

  const pressReleases = await CommunicationsService.listPressReleases(organizationId, opts as never);
  return NextResponse.json({ pressReleases });
}

/** POST /api/communications/press-releases — create a press release */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const content = String(body.content || '').trim();
  if (!title || !content) {
    return NextResponse.json({ error: 'title_and_content_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const pressRelease = await CommunicationsService.createPressRelease(
      ws.organizationId, ws.id,
      {
        title, content, summary: body.summary, status: body.status ?? 'draft',
        publishDate: body.publishDate, embargoDate: body.embargoDate,
        author: body.author, distributionList: body.distributionList,
        tags: body.tags, mediaAssets: body.mediaAssets,
      },
      session.user.id,
    );
    return NextResponse.json({ pressRelease }, { status: 201 });
  } catch (e) {
    console.error('[communications/press-releases] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_press_release' }, { status: 500 });
  }
}
