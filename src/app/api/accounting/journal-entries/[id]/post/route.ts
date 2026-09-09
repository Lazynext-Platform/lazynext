import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AccountingService } from '@/lib/services/accounting-service';

/** POST /api/accounting/journal-entries/[id]/post — post a journal entry */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const entry = await AccountingService.postJournalEntry(id);
    return NextResponse.json({ entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_post_journal_entry';
    if (msg === 'journal_entry_not_found') {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg === 'journal_entry_already_posted') {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error('[accounting/post] error:', e);
    return NextResponse.json({ error: 'failed_to_post_journal_entry' }, { status: 500 });
  }
}
