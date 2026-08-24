import type { CreditPack } from '@/config/pricing';

export interface CheckoutArgs {
  userId: string;
  email?: string | null;
  pack: CreditPack;
  origin: string;
  // ── Global checkout params (passed through to Dodo Payments) ──
  // UI locale → Dodo hosted checkout language (force_language)
  locale?: string;
  // ISO 3166-1 alpha-2 country code → billing_address.country + currency detection
  country?: string;
  // ISO 4217 currency code → billing_currency (when adaptive pricing is enabled)
  currency?: string;
}

/**
 * Two payment shapes the starter ships with:
 *  - mode 'checkout': hosted payment page (Dodo Payments). Dev keeps the revenue.
 *  - mode 'redeem':   user enters a code (Atlas credits). No checkout needed.
 * A provider implements the method matching its mode.
 */
export interface PaymentProvider {
  id: 'dodo' | 'atlas';
  mode: 'checkout' | 'redeem';
  createCheckout?(args: CheckoutArgs): Promise<{ url: string }>;
  redeem?(userId: string, code: string): Promise<{ amount: number }>;
}
