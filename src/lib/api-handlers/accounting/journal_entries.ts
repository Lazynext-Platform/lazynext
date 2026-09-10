import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AccountingService } from '@/lib/services/accounting-service';

/** GET /api/accounting/journal-entries — list journal entries */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ entries: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { status?: string; period?: string; fromDate?: Date; toDate?: Date } = {};
  const status = sp.get('status');
  const period = sp.get('period');
  const fromDate = sp.get('fromDate');
  const toDate = sp.get('toDate');
  if (status) opts.status = status;
  if (period) opts.period = period;
  if (fromDate) opts.fromDate = new Date(fromDate);
  if (toDate) opts.toDate = new Date(toDate);

  const entries = await AccountingService.listJournalEntries(organizationId, opts);
  return NextResponse.json({ entries });
}

/** POST /api/accounting/journal-entries — create a journal entry */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;
  const workspaceId = body.workspaceId?.trim() || null;
  if (!body.lines || !Array.isArray(body.lines) || body.lines.length < 2) {
    return NextResponse.json({ error: 'at_least_two_lines_required' }, { status: 400 });
  }

  try {
    const entry = await AccountingService.createJournalEntry(
      organizationId,
      workspaceId,
      {
        date: body.date ? new Date(body.date) : undefined,
        description: body.description,
        reference: body.reference,
        lines: body.lines,
      },
      session.user.id,
    );
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_create_journal_entry';
    if (msg === 'journal_entry_not_balanced' || msg === 'journal_entry_requires_at_least_two_lines' || msg === 'period_is_closed') {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error('[accounting/journal-entries] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_journal_entry' }, { status: 500 });
  }
}
