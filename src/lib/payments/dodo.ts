import DodoPayments from 'dodopayments';
import type { PaymentProvider } from './types';

// Dodo Payments client: uses fetch-based HTTP, compatible with Cloudflare Workers.
// Environment is controlled by DODO_PAYMENTS_ENVIRONMENT ('test_mode' or 'live_mode').
export const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY || '',
  environment: (process.env.DODO_PAYMENTS_ENVIRONMENT as 'test_mode' | 'live_mode') || 'test_mode',
});

// Maps credit pack IDs to Dodo product IDs (set via env vars after running setup-dodo-products).
const PRODUCT_ID_MAP: Record<string, string | undefined> = {
  starter: process.env.DODO_PRODUCT_STARTER,
  pro: process.env.DODO_PRODUCT_PRO,
  elite: process.env.DODO_PRODUCT_ELITE,
};

// "Bring your own Dodo": the end-user pays you, you keep 100% of it.
// Credits are granted in the Dodo webhook after payment confirms.
export const dodoProvider: PaymentProvider = {
  id: 'dodo',
  mode: 'checkout',
  async createCheckout({ userId, email, pack, origin, locale, country, currency }) {
    const productId = PRODUCT_ID_MAP[pack.id];
    if (!productId) throw new Error(`No Dodo product ID configured for pack "${pack.id}". Run npm run setup:dodo to create products.`);

    // Build the checkout session with global params:
    //  - customization.force_language: renders Dodo's hosted checkout page in the user's UI language
    //  - billing_address.country: helps Dodo auto-detect the right currency and payment methods
    //  - billing_currency: explicitly requests a specific currency (requires Adaptive Pricing enabled in dashboard)
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      return_url: `${origin}/pricing?paid=1`,
      ...(email ? { customer: { email } } : {}),
      metadata: { userId, credits: String(pack.credits), packId: pack.id },
      // ── Global: force checkout page language to match the user's UI locale ──
      ...(locale
        ? {
            customization: {
              force_language: locale,
            },
          }
        : {}),
      // ── Global: pass billing address country so Dodo can auto-detect currency + show local payment methods ──
      ...(country
        ? {
            billing_address: { country: country as never },
          }
        : {}),
      // ── Global: explicitly request billing in the user's preferred currency (requires Adaptive Pricing) ──
      ...(currency
        ? {
            billing_currency: currency as never,
          }
        : {}),
      // Let the customer edit their country/currency at checkout if they want
      feature_flags: {
        allow_currency_selection: true,
        allow_customer_editing_country: true,
      },
    });

    const checkoutUrl = (session as { checkout_url?: string | null }).checkout_url;
    if (!checkoutUrl) throw new Error('Dodo did not return a checkout URL');
    return { url: checkoutUrl };
  },
};
