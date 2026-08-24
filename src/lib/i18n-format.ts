/**
 * Locale-aware formatting utilities.
 * Uses Intl APIs with the active locale for date/number display.
 */

import type { Locale } from '@/i18n/messages';

// Map our locale codes to BCP 47 tags for Intl APIs
const BCP47: Record<Locale, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
  es: 'es-ES',
  ko: 'ko-KR',
  pt: 'pt-BR',
  fr: 'fr-FR',
  de: 'de-DE',
  ar: 'ar-SA',
  hi: 'hi-IN',
  vi: 'vi-VN',
  th: 'th-TH',
  id: 'id-ID',
};

/** Format a date string/Date in the user's locale */
export function formatDate(input: string | Date, locale: Locale): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return String(input);
  return d.toLocaleDateString(BCP47[locale] || 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format a date+time string/Date in the user's locale */
export function formatDateTime(input: string | Date, locale: Locale): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return String(input);
  return d.toLocaleString(BCP47[locale] || 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format a number with locale-appropriate grouping */
export function formatNumber(n: number, locale: Locale): string {
  return n.toLocaleString(BCP47[locale] || 'en-US');
}

/** Format a currency amount (amount is in the given currency's major units) */
export function formatCurrency(amount: number, currencyCode: string, locale: Locale): string {
  try {
    return new Intl.NumberFormat(BCP47[locale] || 'en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currencyCode}`;
  }
}

/** Relative time formatting (e.g. "3 days ago", "2 hours ago") */
export function formatRelativeTime(input: string | Date, locale: Locale): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return String(input);
  const diff = Date.now() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  try {
    const rtf = new Intl.RelativeTimeFormat(BCP47[locale] || 'en-US', { numeric: 'auto' });
    if (days > 0) return rtf.format(-days, 'day');
    if (hours > 0) return rtf.format(-hours, 'hour');
    if (minutes > 0) return rtf.format(-minutes, 'minute');
    return rtf.format(-seconds, 'second');
  } catch {
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }
}

/** Get a localized country name using Intl.DisplayNames */
export function getCountryName(countryCode: string, locale: Locale): string {
  try {
    const dn = new (Intl as any).DisplayNames([BCP47[locale] || 'en-US'], { type: 'region' });
    const name = dn.of(countryCode);
    return name || countryCode;
  } catch {
    return countryCode;
  }
}

/** Get a localized currency name using Intl.DisplayNames */
export function getCurrencyName(currencyCode: string, locale: Locale): string {
  try {
    const dn = new (Intl as any).DisplayNames([BCP47[locale] || 'en-US'], { type: 'currency' });
    const name = dn.of(currencyCode);
    return name || currencyCode;
  } catch {
    return currencyCode;
  }
}
