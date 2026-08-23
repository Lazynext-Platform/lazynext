import Stripe from 'stripe';
import type { PaymentProvider } from './types';

// Cloudflare Workers doesn't have Node's http module, so the Stripe SDK must use a fetch-based httpClient,
// otherwise checkout.sessions.create fails in production (manifests as the frontend "Buy credits" button doing nothing).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  httpClient: Stripe.createFetchHttpClient(),
});

// "Bring your own Stripe": the end-user pays you, you keep 100% of it.
// Credits are granted in the Stripe webhook after payment confirms.
export const stripeProvider: PaymentProvider = {
  id: 'stripe',
  mode: 'checkout',
  async createCheckout({ userId, email, pack, origin }) {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(pack.priceUsd * 100),
            product_data: { name: `${pack.name} · ${pack.credits} credits` },
          },
        },
      ],
      success_url: `${origin}/dashboard?paid=1`,
      cancel_url: `${origin}/pricing?canceled=1`,
      ...(email ? { customer_email: email } : {}),
      metadata: { userId, credits: String(pack.credits), packId: pack.id },
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return { url: session.url };
  },
};
