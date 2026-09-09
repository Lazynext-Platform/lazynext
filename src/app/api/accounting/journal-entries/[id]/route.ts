import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AccountingService } from '@/lib/services/accounting-service';

/** GET /api/accounting/journal-entries/[id] — get a single journal entry with lines */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const entry = await AccountingService.getJournalEntry(id);
  if (!entry) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ entry });
}
