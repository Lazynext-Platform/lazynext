export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  highlight?: boolean;
}

// Credit packs your end-users buy. Credits are YOUR in-app currency —
// set the price to whatever margin you want over Atlas's per-call cost.
export const CREDIT_PACKS: CreditPack[] = [
  { id: 'starter', name: 'Starter', credits: 100, priceUsd: 9 },
  { id: 'pro', name: 'Pro', credits: 600, priceUsd: 39, highlight: true },
  { id: 'elite', name: 'Elite', credits: 2000, priceUsd: 99 },
];

export const getPack = (id: string) => CREDIT_PACKS.find((p) => p.id === id);

// ── Multi-currency display support ──
// Base prices are in USD. For display in other currencies, we use approximate
// static conversion rates. The actual charge currency is determined by Dodo Payments
// (Adaptive Currency / Localized Pricing), so these are display-only estimates.
// When the user checks out, Dodo handles the real conversion at live FX rates.

export interface CurrencyInfo {
  code: string;       // ISO 4217 code
  symbol: string;     // display symbol
  name: string;       // human-readable name
  rateFromUsd: number; // approximate conversion rate (1 USD = X currency units)
  locale: string;     // BCP-47 locale for number formatting
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', rateFromUsd: 1, locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', rateFromUsd: 0.92, locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', rateFromUsd: 0.79, locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateFromUsd: 157, locale: 'ja-JP' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rateFromUsd: 7.24, locale: 'zh-CN' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateFromUsd: 83.5, locale: 'en-IN' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', rateFromUsd: 1370, locale: 'ko-KR' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rateFromUsd: 5.05, locale: 'pt-BR' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rateFromUsd: 1.52, locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rateFromUsd: 1.37, locale: 'en-CA' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rateFromUsd: 1.35, locale: 'en-SG' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', rateFromUsd: 7.81, locale: 'zh-HK' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar', rateFromUsd: 32.3, locale: 'zh-TW' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', rateFromUsd: 36.5, locale: 'th-TH' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', rateFromUsd: 25400, locale: 'vi-VN' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', rateFromUsd: 16200, locale: 'id-ID' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', rateFromUsd: 58.5, locale: 'en-PH' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', rateFromUsd: 4.71, locale: 'en-MY' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rateFromUsd: 3.67, locale: 'ar-AE' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', rateFromUsd: 3.75, locale: 'ar-SA' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', rateFromUsd: 32.5, locale: 'tr-TR' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', rateFromUsd: 18.6, locale: 'en-ZA' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', rateFromUsd: 18.2, locale: 'es-MX' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', rateFromUsd: 0.90, locale: 'de-CH' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', rateFromUsd: 10.6, locale: 'sv-SE' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', rateFromUsd: 10.8, locale: 'nb-NO' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', rateFromUsd: 6.86, locale: 'da-DK' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', rateFromUsd: 4.0, locale: 'pl-PL' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', rateFromUsd: 92, locale: 'ru-RU' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rateFromUsd: 1600, locale: 'en-NG' },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as readonly string[];

export function getCurrency(code: string): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

/** Display a USD price in the given currency (approximate, for UI only). */
export function displayPrice(priceUsd: number, currencyCode: string): { symbol: string; formatted: string; code: string } {
  const c = getCurrency(currencyCode);
  const converted = priceUsd * c.rateFromUsd;
  // JPY/KRW/VND/IDR: no decimals; others: 2 decimals
  const noDecimal = ['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'PYG'].includes(c.code);
  const formatted = noDecimal
    ? Math.round(converted).toLocaleString(c.locale)
    : converted.toLocaleString(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return { symbol: c.symbol, formatted, code: c.code };
}

// ── Country → default currency mapping (for geo-detection) ──
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR',
  IE: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR',
  EE: 'EUR', LV: 'EUR', LT: 'EUR', CY: 'EUR', MT: 'EUR', HR: 'EUR',
  JP: 'JPY', CN: 'CNY', KR: 'KRW', IN: 'INR', BR: 'BRL', MX: 'MXN',
  SG: 'SGD', HK: 'HKD', TW: 'TWD', TH: 'THB', VN: 'VND', ID: 'IDR',
  PH: 'PHP', MY: 'MYR', AE: 'AED', SA: 'SAR', TR: 'TRY', ZA: 'ZAR',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', RU: 'RUB',
  NG: 'NGN', EG: 'EGP', KE: 'KES', GH: 'GHS', AR: 'ARS', CL: 'CLP',
  CO: 'COP', PE: 'PEN', VE: 'VES', UA: 'UAH', IL: 'ILS', PK: 'PKR',
  BD: 'BDT', LK: 'LKR', NP: 'NPR', KH: 'KHR', LA: 'LAK', MM: 'MMK',
};

export function currencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode] || 'USD';
}
