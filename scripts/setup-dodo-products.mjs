// Creates the 3 credit pack products in Dodo Payments and prints the env vars to set.
// Run: DODO_PAYMENTS_API_KEY=xxx DODO_PAYMENTS_ENVIRONMENT=test_mode node scripts/setup-dodo-products.mjs

// Credit pack definitions (mirrors src/config/pricing.ts)
const CREDIT_PACKS = [
  { id: 'starter', name: 'Starter', credits: 100, priceUsd: 9 },
  { id: 'pro', name: 'Pro', credits: 600, priceUsd: 39, highlight: true },
  { id: 'elite', name: 'Elite', credits: 2000, priceUsd: 99 },
];

const API_KEY = process.env.DODO_PAYMENTS_API_KEY;
const ENVIRONMENT = process.env.DODO_PAYMENTS_ENVIRONMENT || 'test_mode';

if (!API_KEY) {
  console.error('Error: DODO_PAYMENTS_API_KEY is required.');
  console.error('Get your API key from the Dodo Payments dashboard → Developer → API.');
  process.exit(1);
}

const BASE_URL = ENVIRONMENT === 'live_mode'
  ? 'https://live.dodopayments.com'
  : 'https://test.dodopayments.com';

async function createProduct(pack) {
  const body = {
    name: `${pack.name} — ${pack.credits} credits`,
    description: `${pack.credits} Lazynext credits for AI ad generation. Valid for all studios.`,
    price: {
      currency: 'USD',
      price: pack.priceUsd,
      discount: 0,
      type: 'one_time_price',
    },
    tax_category: 'digital_products',
    metadata: { packId: pack.id, credits: String(pack.credits) },
  };

  const res = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create product "${pack.name}": ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.product_id;
}

async function main() {
  console.log(`Creating ${CREDIT_PACKS.length} products in Dodo Payments (${ENVIRONMENT})...\n`);

  const productIds = {};
  for (const pack of CREDIT_PACKS) {
    const productId = await createProduct(pack);
    productIds[pack.id] = productId;
    console.log(`  ${pack.name}: ${productId}`);
  }

  console.log('\n✅ Products created! Add these to your environment variables:');
  console.log('');
  for (const [packId, productId] of Object.entries(productIds)) {
    const envKey = `DODO_PRODUCT_${packId.toUpperCase()}`;
    console.log(`${envKey}=${productId}`);
  }
  console.log('');
  console.log('For Cloudflare Workers, set them with:');
  for (const [packId, productId] of Object.entries(productIds)) {
    const envKey = `DODO_PRODUCT_${packId.toUpperCase()}`;
    console.log(`  npx wrangler secret put ${envKey}  # value: ${productId}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
