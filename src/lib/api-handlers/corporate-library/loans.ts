import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateLibraryService } from '@/lib/services/corporate-library-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ loans: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['itemId', 'borrowerId', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const loans = await CorporateLibraryService.listLoans(organizationId, opts as never);
  return NextResponse.json({ loans });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId || '').trim();
  const borrowerId = String(body.borrowerId || '').trim();
  const borrowerName = String(body.borrowerName || '').trim();
  if (!itemId || !borrowerId || !borrowerName) return NextResponse.json({ error: 'itemId_borrowerId_borrowerName_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const loan = await CorporateLibraryService.createLoan(ws.organizationId, ws.id, {
      itemId, borrowerId, borrowerName,
      status: body.status, checkoutDate: body.checkoutDate, dueDate: body.dueDate,
      returnDate: body.returnDate, renewedDate: body.renewedDate,
      condition: body.condition, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ loan }, { status: 201 });
  } catch (e) {
    console.error('[corporate-library/loans] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_loan' }, { status: 500 });
  }
}
