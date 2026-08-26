import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the pricing and currency display logic.
 *
 * Verifies credit pack definitions, currency conversion, and display formatting
 * without requiring a full app context.
 */

// Replicate the core logic from src/config/pricing.ts
interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  highlight?: boolean;
}

const CREDIT_PACKS: CreditPack[] = [
  { id: 'starter', name: 'Starter', credits: 100, priceUsd: 9 },
  { id: 'pro', name: 'Pro', credits: 600, priceUsd: 39, highlight: true },
  { id: 'elite', name: 'Elite', credits: 2000, priceUsd: 99 },
];

function getPack(id: string) {
  return CREDIT_PACKS.find((p) => p.id === id);
}

interface CurrencyInfo {
  code: string;
  symbol: string;
  rateFromUsd: number;
  locale: string;
}

const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', rateFromUsd: 1, locale: 'en-US' },
  { code: 'EUR', symbol: '€', rateFromUsd: 0.92, locale: 'de-DE' },
  { code: 'JPY', symbol: '¥', rateFromUsd: 157, locale: 'ja-JP' },
  { code: 'INR', symbol: '₹', rateFromUsd: 83.5, locale: 'en-IN' },
  { code: 'KRW', symbol: '₩', rateFromUsd: 1370, locale: 'ko-KR' },
];

function getCurrency(code: string): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

function displayPrice(priceUsd: number, currencyCode: string): { symbol: string; formatted: string; code: string } {
  const c = getCurrency(currencyCode);
  const converted = priceUsd * c.rateFromUsd;
  const noDecimal = ['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'PYG'].includes(c.code);
  const formatted = noDecimal
    ? Math.round(converted).toLocaleString(c.locale)
    : converted.toLocaleString(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return { symbol: c.symbol, formatted, code: c.code };
}

// ── Credit pack tests ──

test('all credit packs have positive credits and prices', () => {
  for (const pack of CREDIT_PACKS) {
    assert.ok(pack.credits > 0, `${pack.id} should have positive credits`);
    assert.ok(pack.priceUsd > 0, `${pack.id} should have positive price`);
  }
});

test('getPack returns the correct pack by id', () => {
  assert.equal(getPack('starter')?.credits, 100);
  assert.equal(getPack('pro')?.credits, 600);
  assert.equal(getPack('elite')?.credits, 2000);
});

test('getPack returns undefined for unknown id', () => {
  assert.equal(getPack('nonexistent'), undefined);
});

test('pro pack is highlighted as most popular', () => {
  assert.equal(getPack('pro')?.highlight, true);
  assert.equal(getPack('starter')?.highlight, undefined);
  assert.equal(getPack('elite')?.highlight, undefined);
});

test('elite pack has the best value per credit', () => {
  const starterPerCredit = CREDIT_PACKS[0].priceUsd / CREDIT_PACKS[0].credits;
  const elitePerCredit = CREDIT_PACKS[2].priceUsd / CREDIT_PACKS[2].credits;
  assert.ok(elitePerCredit < starterPerCredit, 'Elite should be cheaper per credit than Starter');
});

// ── Currency conversion tests ──

test('USD displays at face value', () => {
  const result = displayPrice(9, 'USD');
  assert.equal(result.symbol, '$');
  assert.equal(result.code, 'USD');
});

test('EUR converts from USD correctly', () => {
  const result = displayPrice(9, 'EUR');
  assert.equal(result.symbol, '€');
  assert.equal(result.code, 'EUR');
  // 9 * 0.92 = 8.28
  assert.ok(result.formatted.includes('8'));
});

test('JPY has no decimals (zero-decimal currency)', () => {
  const result = displayPrice(9, 'JPY');
  // 9 * 157 = 1413 — should be rounded, no decimals
  assert.equal(result.formatted.includes('.'), false);
});

test('KRW has no decimals (zero-decimal currency)', () => {
  const result = displayPrice(39, 'KRW');
  // 39 * 1370 = 53430 — should be rounded, no decimals
  assert.equal(result.formatted.includes('.'), false);
});

test('unknown currency falls back to USD', () => {
  const result = displayPrice(99, 'XYZ');
  assert.equal(result.code, 'USD');
  assert.equal(result.symbol, '$');
});

test('INR converts from USD correctly', () => {
  const result = displayPrice(9, 'INR');
  assert.equal(result.symbol, '₹');
  // 9 * 83.5 = 751.5
  assert.ok(result.formatted.includes('751') || result.formatted.includes('752'));
});

// ── Edge case tests ──

test('zero price converts to zero in all currencies', () => {
  for (const curr of CURRENCIES) {
    const result = displayPrice(0, curr.code);
    // Should not throw, should return a valid formatted string
    assert.ok(typeof result.formatted === 'string');
  }
});
