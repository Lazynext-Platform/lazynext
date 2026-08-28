import { prisma } from '@/lib/prisma';

/**
 * Infer a user's plan tier from their credit purchase history.
 *
 * LazyNext uses credit packs (not recurring subscriptions):
 *   starter = 100 credits
 *   pro     = 600 credits
 *   elite   = 2000 credits
 *
 * The tier is inferred from the largest single purchase in the CreditLedger.
 * Users who have never purchased get 'free' tier.
 */
export type PlanTier = 'free' | 'starter' | 'pro' | 'elite';

/** Map credit pack amounts to plan tiers. */
const CREDITS_TO_TIER: Array<{ min: number; tier: PlanTier }> = [
  { min: 2000, tier: 'elite' },
  { min: 600, tier: 'pro' },
  { min: 100, tier: 'starter' },
];

/**
 * Get the user's plan tier based on their largest credit purchase.
 * Falls back to 'free' if no purchases found.
 */
export async function getUserPlanTier(userId: string): Promise<PlanTier> {
  const purchases = await prisma.creditLedger.findMany({
    where: { userId, reason: 'purchase', delta: { gt: 0 } },
    select: { delta: true },
    orderBy: { delta: 'desc' },
    take: 1,
  });

  const largestPurchase = purchases[0]?.delta ?? 0;

  for (const { min, tier } of CREDITS_TO_TIER) {
    if (largestPurchase >= min) return tier;
  }

  return 'free';
}
