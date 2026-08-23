import { prisma } from '@/lib/prisma';
import { isByok } from '@/lib/request-context';

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
  if (amount <= 0) return;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { credits: { increment: amount } } }),
    prisma.creditLedger.create({ data: { userId, delta: amount, reason, ref } }),
  ]);
}

/** Atomically spend credits. Throws INSUFFICIENT_CREDITS if balance too low. */
export async function deductCredits(
  userId: string,
  amount: number,
  reason: string,
  ref?: string,
): Promise<void> {
  if (isByok()) return; // BYOK: user pays AtlasCloud directly — skip billing entirely.
  if (amount <= 0) return;
  // Conditional atomic deduction: if balance is insufficient, 0 rows are affected with no side effects.
  const res = await prisma.user.updateMany({
    where: { id: userId, credits: { gte: amount } },
    data: { credits: { decrement: amount } },
  });
  if (res.count === 0) throw new Error('INSUFFICIENT_CREDITS');
  // Cloudflare D1 does not support interactive transactions, so we use compensation: if ledger write fails, add back the deducted credits to avoid "charged without a ledger entry".
  try {
    await prisma.creditLedger.create({ data: { userId, delta: -amount, reason, ref } });
  } catch (e) {
    // Ledger write failed → compensatory add-back of deducted credits. If compensation also fails (two DB failures), log for manual reconciliation.
    await prisma.user.update({ where: { id: userId }, data: { credits: { increment: amount } } }).catch((re) => {
      console.error(`[credits] CRITICAL: deduct succeeded but ledger+rollback both failed uid=${userId} amount=${amount} ref=${ref}:`, String(re));
    });
    throw e;
  }
}
