import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GitHubService } from '@/lib/services/github';

/**
 * GET /api/github/files — get file contents from a repository.
 * Query params: owner, repo, path, ref?
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');
  const path = searchParams.get('path');
  const ref = searchParams.get('ref') || undefined;

  if (!owner || !repo || !path) {
    return NextResponse.json({ error: 'owner_repo_path_required' }, { status: 400 });
  }

  try {
    const file = await GitHubService.getFile(session.user.id, owner, repo, path, ref);
    if (!file) {
      return NextResponse.json({ error: 'file_not_found' }, { status: 404 });
    }
    return NextResponse.json({ content: file.content, sha: file.sha });
  } catch (e) {
    console.error('[github/files] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_file' }, { status: 500 });
  }
}

/**
 * PUT /api/github/files — create or update a file in a repository.
 * Body: { owner, repo, path, message, content, branch, sha? }
 */
export async function PUT(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    owner?: string;
    repo?: string;
    path?: string;
    message?: string;
    content?: string;
    branch?: string;
    sha?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const owner = body.owner?.trim();
  const repo = body.repo?.trim();
  const path = body.path?.trim();
  const message = body.message?.trim();
  const content = body.content;
  const branch = body.branch?.trim();
  if (!owner || !repo || !path || !message || content === undefined || !branch) {
    return NextResponse.json({ error: 'owner_repo_path_message_content_branch_required' }, { status: 400 });
  }

  try {
    const result = await GitHubService.createOrUpdateFile(session.user.id, owner, repo, {
      path,
      message,
      content,
      branch,
      sha: body.sha,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, commit: result.commit });
  } catch (e) {
    console.error('[github/files] put error:', e);
    return NextResponse.json({ ok: false, error: 'failed_to_update_file' }, { status: 500 });
  }
}
