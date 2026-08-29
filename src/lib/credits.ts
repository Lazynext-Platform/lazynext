import { prisma } from '@/lib/prisma';
import { isByok } from '@/lib/request-context';
import { emitCreditsCharged, emitCreditsRefunded } from '@/lib/observability/events';

export async function getCredits(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
  return u?.credits ?? 0;
}

export async function grantCredits(
  userId: string,
  amount: number,
  reason: string,
  ref?: string,
): Promise<void> {
  if (isByok()) return; // BYOK: user pays AtlasCloud directly — no credit movement at all.
  if (amount === 0) return; // Allow negative amounts for refund claw-backs (e.g. webhook refund.succeeded).
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { credits: { increment: amount } } }),
    prisma.creditLedger.create({ data: { userId, delta: amount, reason, ref } }),
  ]);
}

/** Atomically spend credits. Throws INSUFFICIENT_CREDITS if balance too low.
 *  If `idempotencyKey` is provided and a ledger entry with that key already exists,
 *  the charge is treated as already applied — the deduction is reversed and the
 *  function returns without error (idempotent retry).
 */
export async function deductCredits(
  userId: string,
  amount: number,
  reason: string,
  ref?: string,
  idempotencyKey?: string,
): Promise<void> {
  if (isByok()) return; // BYOK: user pays AtlasCloud directly — skip billing entirely.
  if (amount <= 0) return;
  // Conditional atomic deduction: if balance is insufficient, 0 rows are affected with no side effects.
  const res = await prisma.user.updateMany({
    where: { id: userId, credits: { gte: amount } },
    data: { credits: { decrement: amount } },
  });
  if (res.count === 0) throw new Error('INSUFFICIENT_CREDITS');
  emitCreditsCharged(userId, amount, reason);
  // Cloudflare D1 does not support interactive transactions, so we use compensation: if ledger write fails, add back the deducted credits to avoid "charged without a ledger entry".
  try {
    await prisma.creditLedger.create({
      data: { userId, delta: -amount, reason, ref, idempotencyKey },
    });
  } catch (e: any) {
    // If the unique constraint on (userId, idempotencyKey) was violated, this
    // charge already happened in a previous request. Reverse the duplicate
    // deduction and return successfully (idempotent retry).
    const isUniqueViolation =
      e?.code === 'P2002' ||
      String(e?.message || '').includes('UNIQUE constraint') ||
      String(e?.message || '').includes('unique');
    if (isUniqueViolation && idempotencyKey) {
      await prisma.user
        .update({ where: { id: userId }, data: { credits: { increment: amount } } })
        .catch((re) => {
          console.error(
            `[credits] CRITICAL: idempotent reversal failed uid=${userId} amount=${amount} key=${idempotencyKey}:`,
            String(re),
          );
        });
      return; // Idempotent — charge already exists, no error
    }
    // Ledger write failed → compensatory add-back of deducted credits. If compensation also fails (two DB failures), log for manual reconciliation.
    await prisma.user.update({ where: { id: userId }, data: { credits: { increment: amount } } }).catch((re) => {
      console.error(`[credits] CRITICAL: deduct succeeded but ledger+rollback both failed uid=${userId} amount=${amount} ref=${ref}:`, String(re));
    });
    emitCreditsRefunded(userId, amount, `${reason}:ledger_rollback`);
    throw e;
  }
}

/** Refund credits for a failed operation (e.g. pipeline stage failure). */
export async function refundCredits(userId: string, amount: number, ref?: string): Promise<void> {
  if (isByok()) return;
  if (amount <= 0) return;
  await grantCredits(userId, amount, 'refund', ref);
  emitCreditsRefunded(userId, amount, ref || 'refund');
}
