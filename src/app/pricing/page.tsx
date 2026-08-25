import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LOCALES, type Locale, messages } from '@/i18n/messages';
import { CREDIT_PACKS } from '@/config/pricing';
import { paymentMode } from '@/lib/payments';
import PricingClient from './PricingClient';

export async function generateMetadata(): Promise<Metadata> {
  const localeCookie = (await cookies()).get('locale')?.value;
  const locale = ((LOCALES as readonly string[]).includes(localeCookie || '') ? localeCookie : 'en') as Locale;
  const nav = (messages[locale] as any)?.nav || (messages.en as any).nav;
  return { title: `${nav.pricing} — Lazynext`, referrer: 'no-referrer' };
}

export default function PricingPage() {
  return <PricingClient packs={CREDIT_PACKS} mode={paymentMode()} />;
}
