import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** POST /api/customer-success/expansions/[id]/close — close an expansion */
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
  const status = String(body.status || '').trim();
  if (status !== 'won' && status !== 'lost') {
    return NextResponse.json({ error: 'status_must_be_won_or_lost' }, { status: 400 });
  }

  try {
    const expansion = await CustomerSuccessService.closeExpansion(id, status as 'won' | 'lost', session.user.id, body.notes);
    if (!expansion) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ expansion });
  } catch (e) {
    console.error('[customer-success/expansions/close] error:', e);
    return NextResponse.json({ error: 'failed_to_close_expansion' }, { status: 500 });
  }
}
