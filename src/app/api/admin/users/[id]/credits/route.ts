import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { grantCredits } from '@/lib/credits';

/**
 * POST /api/admin/users/[id]/credits
 * Body: { amount: number, reason?: string }
 * Adjusts a user's credit balance by `amount` (positive=grant, negative=deduct).
 * Records the adjustment in the credit ledger with reason 'admin_adjust'.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const amount = parseInt(String(body.amount), 10);

  if (!Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
  }

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, credits: true } });
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 200) : 'admin_adjust';

  try {
    await grantCredits(id, amount, 'admin_adjust', `admin:${session.user.id}:${reason}`);
    const updated = await prisma.user.findUnique({ where: { id }, select: { credits: true } });
    return NextResponse.json({ ok: true, credits: updated?.credits ?? 0 });
  } catch (e) {
    return NextResponse.json({ error: 'adjust_failed', detail: String(e) }, { status: 500 });
  }
}
