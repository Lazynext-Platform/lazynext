import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AccountingService } from '@/lib/services/accounting-service';

/** POST /api/accounting/journal-entries/[id]/reverse — reverse a journal entry */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' ? body.reason : '';
  try {
    const reversal = await AccountingService.reverseJournalEntry(id, reason);
    return NextResponse.json({ entry: reversal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_reverse_journal_entry';
    if (msg === 'journal_entry_not_found') {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg === 'journal_entry_already_reversed') {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error('[accounting/reverse] error:', e);
    return NextResponse.json({ error: 'failed_to_reverse_journal_entry' }, { status: 500 });
  }
}
