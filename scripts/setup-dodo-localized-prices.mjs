// Sets up localized prices for existing Dodo Products by currency.
// This creates fixed-price overrides per currency so customers see
// region-appropriate pricing instead of a USD-only amount.
//
// Usage:
//   DODO_PAYMENTS_API_KEY=xxx DODO_PAYMENTS_ENVIRONMENT=test_mode \
//   DODO_PRODUCT_STARTER=prod_xxx DODO_PRODUCT_PRO=prod_xxx DODO_PRODUCT_ELITE=prod_xxx \
//   node scripts/setup-dodo-localized-prices.mjs
//
// Add --dry-run to preview without making API calls.
// Add --clear to remove existing localized prices before creating new ones.

const API_KEY = process.env.DODO_PAYMENTS_API_KEY;
const ENVIRONMENT = process.env.DODO_PAYMENTS_ENVIRONMENT || 'test_mode';
const DRY_RUN = process.argv.includes('--dry-run');
const CLEAR = process.argv.includes('--clear');

if (!API_KEY && !DRY_RUN) {
  console.error('Error: DODO_PAYMENTS_API_KEY is required (or use --dry-run).');
  process.exit(1);
}

const BASE_URL = ENVIRONMENT === 'live_mode'
  ? 'https://live.dodopayments.com'
  : 'https://test.dodopayments.com';

// Product IDs from environment
const PRODUCTS = [
  { packId: 'starter', productId: process.env.DODO_PRODUCT_STARTER, name: 'Starter', priceUsd: 9 },
  { packId: 'pro', productId: process.env.DODO_PRODUCT_PRO, name: 'Pro', priceUsd: 39 },
  { packId: 'elite', productId: process.env.DODO_PRODUCT_ELITE, name: 'Elite', priceUsd: 99 },
].filter((p) => p.productId);

if (PRODUCTS.length === 0 && !DRY_RUN) {
  console.error('Error: No product IDs found. Set DODO_PRODUCT_STARTER, DODO_PRODUCT_PRO, DODO_PRODUCT_ELITE.');
  process.exit(1);
}

// Localized price definitions per currency.
// Prices are rounded to "psychological" local price points (e.g. 9.99, 39.99).
// These are FIXED prices, not FX-converted — they reflect local market expectations.
const LOCALIZED_PRICES = {
  // Europe
  EUR: { starter: 9.99, pro: 39.99, elite: 99.99 },
  GBP: { starter: 8.99, pro: 34.99, elite: 89.99 },
  CHF: { starter: 10.90, pro: 42.90, elite: 109.00 },
  SEK: { starter: 109, pro: 429, elite: 1090 },
  NOK: { starter: 109, pro: 429, elite: 1090 },
  DKK: { starter: 75, pro: 295, elite: 745 },
  PLN: { starter: 44.99, pro: 179.99, elite: 449.99 },

  // Asia
  JPY: { starter: 1500, pro: 5800, elite: 14800 },
  CNY: { starter: 68, pro: 268, elite: 688 },
  KRW: { starter: 12900, pro: 49000, elite: 129000 },
  INR: { starter: 799, pro: 3299, elite: 8299 },
  SGD: { starter: 13.90, pro: 54.90, elite: 139.00 },
  HKD: { starter: 79, pro: 309, elite: 779 },
  TWD: { starter: 320, pro: 1250, elite: 3150 },
  THB: { starter: 349, pro: 1390, elite: 3490 },
  VND: { starter: 240000, pro: 940000, elite: 2390000 },
  IDR: { starter: 159000, pro: 619000, elite: 1590000 },
  PHP: { starter: 549, pro: 2199, elite: 5499 },
  MYR: { starter: 45.90, pro: 179.90, elite: 459.00 },

  // Middle East
  AED: { starter: 39, pro: 149, elite: 379 },
  SAR: { starter: 39, pro: 149, elite: 379 },
  TRY: { starter: 299, pro: 1199, elite: 2999 },
  ILS: { starter: 39.90, pro: 159.90, elite: 399.00 },

  // Americas
  BRL: { starter: 49.90, pro: 199.90, elite: 499.90 },
  MXN: { starter: 179, pro: 699, elite: 1799 },
  CAD: { starter: 12.99, pro: 52.99, elite: 134.99 },
  AUD: { starter: 14.99, pro: 59.99, elite: 149.99 },
  ARS: { starter: 9900, pro: 39900, elite: 99900 },
  CLP: { starter: 8900, pro: 35900, elite: 89900 },
  COP: { starter: 39000, pro: 159000, elite: 399000 },
  PEN: { starter: 39.90, pro: 159.90, elite: 399.00 },

  // Africa
  ZAR: { starter: 169, pro: 679, elite: 1699 },
  NGN: { starter: 14900, pro: 59900, elite: 149900 },
  EGP: { starter: 449, pro: 1799, elite: 4499 },
  KES: { starter: 1290, pro: 5190, elite: 12990 },
  GHS: { starter: 119, pro: 479, elite: 1199 },

  // Oceania
  NZD: { starter: 16.99, pro: 64.99, elite: 164.99 },
};

async function fetchExistingLocalizedPrices(productId) {
  const res = await fetch(`${BASE_URL}/products/${productId}/localized_prices`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  if (!res.ok) {
    console.warn(`  Warning: could not fetch existing localized prices for ${productId}: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (data.data || []);
}

async function deleteLocalizedPrice(productId, priceId) {
  const res = await fetch(`${BASE_URL}/products/${productId}/localized_prices/${priceId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  return res.ok;
}

async function createLocalizedPrice(productId, currency, price) {
  const body = {
    currency,
    price,
    type: 'one_time_price',
  };
  const res = await fetch(`${BASE_URL}/products/${productId}/localized_prices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create localized price (${currency}=${price}) for ${productId}: ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Setting up localized prices in Dodo Payments (${ENVIRONMENT})...`);
  console.log(`Products: ${PRODUCTS.map((p) => `${p.name}=${p.productId}`).join(', ')}`);
  console.log(`Currencies: ${Object.keys(LOCALIZED_PRICES).join(', ')}`);
  console.log(`Clear existing: ${CLEAR}\n`);

  if (DRY_RUN) {
    for (const product of PRODUCTS) {
      console.log(`\n📦 ${product.name} (${product.productId}):`);
      for (const [currency, prices] of Object.entries(LOCALIZED_PRICES)) {
        const price = prices[product.packId];
        console.log(`  ${currency}: ${price}`);
      }
    }
    console.log('\n✅ Dry run complete. Remove --dry-run to execute.');
    return;
  }

  for (const product of PRODUCTS) {
    console.log(`\n📦 Processing ${product.name} (${product.productId})...`);

    if (CLEAR) {
      const existing = await fetchExistingLocalizedPrices(product.productId);
      if (existing.length > 0) {
        console.log(`  Clearing ${existing.length} existing localized prices...`);
        for (const lp of existing) {
          const id = lp.id || lp.localized_price_id || lp.price_id;
          if (id) {
            await deleteLocalizedPrice(product.productId, id);
            console.log(`    Deleted: ${id}`);
          }
        }
      }
    }

    let created = 0;
    let failed = 0;
    for (const [currency, prices] of Object.entries(LOCALIZED_PRICES)) {
      const price = prices[product.packId];
      try {
        await createLocalizedPrice(product.productId, currency, price);
        console.log(`  ✅ ${currency}: ${price}`);
        created++;
      } catch (e) {
        console.error(`  ❌ ${currency}: ${e.message}`);
        failed++;
      }
    }
    console.log(`  Done: ${created} created, ${failed} failed.`);
  }

  console.log('\n✅ Localized prices setup complete!');
  console.log('\nNext steps:');
  console.log('  1. Verify prices in the Dodo dashboard → Products → [product] → Localized Prices');
  console.log('  2. Enable Adaptive Pricing in Settings → Business for automatic currency conversion');
  console.log('  3. Test checkout with different billing countries to verify localized prices appear');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
