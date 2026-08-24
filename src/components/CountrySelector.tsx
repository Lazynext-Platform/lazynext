'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/i18n/provider';
import { Globe, Check, Loader2 } from 'lucide-react';
import { CURRENCIES } from '@/config/pricing';

// Comprehensive country list (ISO 3166-1 alpha-2) with native names.
// Grouped by region for the selector. Region labels are translated via t('country.regionXxx').
const COUNTRY_GROUPS: { labelKey: string; countries: { code: string; name: string }[] }[] = [
  {
    labelKey: 'country.regionAsia',
    countries: [
      { code: 'CN', name: 'China' }, { code: 'JP', name: 'Japan' }, { code: 'KR', name: 'South Korea' },
      { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' }, { code: 'TH', name: 'Thailand' },
      { code: 'VN', name: 'Vietnam' }, { code: 'PH', name: 'Philippines' }, { code: 'MY', name: 'Malaysia' },
      { code: 'SG', name: 'Singapore' }, { code: 'HK', name: 'Hong Kong' }, { code: 'TW', name: 'Taiwan' },
      { code: 'PK', name: 'Pakistan' }, { code: 'BD', name: 'Bangladesh' }, { code: 'LK', name: 'Sri Lanka' },
      { code: 'KH', name: 'Cambodia' }, { code: 'LA', name: 'Laos' }, { code: 'MM', name: 'Myanmar' },
      { code: 'NP', name: 'Nepal' }, { code: 'MN', name: 'Mongolia' }, { code: 'KZ', name: 'Kazakhstan' },
    ],
  },
  {
    labelKey: 'country.regionMiddleEast',
    countries: [
      { code: 'AE', name: 'United Arab Emirates' }, { code: 'SA', name: 'Saudi Arabia' },
      { code: 'QA', name: 'Qatar' }, { code: 'KW', name: 'Kuwait' }, { code: 'BH', name: 'Bahrain' },
      { code: 'OM', name: 'Oman' }, { code: 'IL', name: 'Israel' }, { code: 'JO', name: 'Jordan' },
      { code: 'EG', name: 'Egypt' }, { code: 'TR', name: 'Turkey' }, { code: 'IR', name: 'Iran' },
      { code: 'IQ', name: 'Iraq' }, { code: 'LB', name: 'Lebanon' },
    ],
  },
  {
    labelKey: 'country.regionEurope',
    countries: [
      { code: 'GB', name: 'United Kingdom' }, { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
      { code: 'ES', name: 'Spain' }, { code: 'IT', name: 'Italy' }, { code: 'NL', name: 'Netherlands' },
      { code: 'BE', name: 'Belgium' }, { code: 'AT', name: 'Austria' }, { code: 'CH', name: 'Switzerland' },
      { code: 'SE', name: 'Sweden' }, { code: 'NO', name: 'Norway' }, { code: 'DK', name: 'Denmark' },
      { code: 'FI', name: 'Finland' }, { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' },
      { code: 'IE', name: 'Ireland' }, { code: 'GR', name: 'Greece' }, { code: 'CZ', name: 'Czech Republic' },
      { code: 'HU', name: 'Hungary' }, { code: 'RO', name: 'Romania' }, { code: 'BG', name: 'Bulgaria' },
      { code: 'HR', name: 'Croatia' }, { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' },
      { code: 'LT', name: 'Lithuania' }, { code: 'LV', name: 'Latvia' }, { code: 'EE', name: 'Estonia' },
      { code: 'IS', name: 'Iceland' }, { code: 'LU', name: 'Luxembourg' }, { code: 'MT', name: 'Malta' },
      { code: 'CY', name: 'Cyprus' }, { code: 'RU', name: 'Russia' }, { code: 'UA', name: 'Ukraine' },
      { code: 'RS', name: 'Serbia' },
    ],
  },
  {
    labelKey: 'country.regionAmericas',
    countries: [
      { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' }, { code: 'MX', name: 'Mexico' },
      { code: 'BR', name: 'Brazil' }, { code: 'AR', name: 'Argentina' }, { code: 'CL', name: 'Chile' },
      { code: 'CO', name: 'Colombia' }, { code: 'PE', name: 'Peru' }, { code: 'VE', name: 'Venezuela' },
      { code: 'UY', name: 'Uruguay' }, { code: 'PY', name: 'Paraguay' }, { code: 'BO', name: 'Bolivia' },
      { code: 'EC', name: 'Ecuador' }, { code: 'CR', name: 'Costa Rica' }, { code: 'PA', name: 'Panama' },
      { code: 'GT', name: 'Guatemala' }, { code: 'DO', name: 'Dominican Republic' }, { code: 'CU', name: 'Cuba' },
    ],
  },
  {
    labelKey: 'country.regionAfrica',
    countries: [
      { code: 'ZA', name: 'South Africa' }, { code: 'NG', name: 'Nigeria' }, { code: 'KE', name: 'Kenya' },
      { code: 'GH', name: 'Ghana' }, { code: 'ET', name: 'Ethiopia' }, { code: 'TZ', name: 'Tanzania' },
      { code: 'UG', name: 'Uganda' }, { code: 'MA', name: 'Morocco' }, { code: 'DZ', name: 'Algeria' },
      { code: 'TN', name: 'Tunisia' }, { code: 'CM', name: 'Cameroon' }, { code: 'CI', name: "Côte d'Ivoire" },
      { code: 'SN', name: 'Senegal' }, { code: 'RW', name: 'Rwanda' }, { code: 'ZM', name: 'Zambia' },
    ],
  },
  {
    labelKey: 'country.regionOceania',
    countries: [
      { code: 'AU', name: 'Australia' }, { code: 'NZ', name: 'New Zealand' }, { code: 'FJ', name: 'Fiji' },
    ],
  },
];

const ALL_COUNTRIES = COUNTRY_GROUPS.flatMap((g) => g.countries);

export function CountrySelector() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [country, setCountry] = useState('US');
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load from cookies
    const cMatch = document.cookie.match(/(?:^|;\s*)country=([^;]+)/);
    const curMatch = document.cookie.match(/(?:^|;\s*)currency=([^;]+)/);
    if (cMatch) setCountry(decodeURIComponent(cMatch[1]));
    if (curMatch) setCurrency(decodeURIComponent(curMatch[1]));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      document.cookie = `country=${country}; path=/; max-age=31536000; samesite=lax`;
      document.cookie = `currency=${currency}; path=/; max-age=31536000; samesite=lax`;
      // Persist to DB if logged in
      if (session) {
        await fetch('/api/me/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country, currency }),
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const tr = { title: t('country.title'), country: t('country.country'), currency: t('country.currency'), save: t('country.save'), saved: t('country.saved') };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-white/50" />
        <h3 className="font-semibold text-white">{tr.title}</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">{tr.country}</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#00b2fc]"
          >
            {COUNTRY_GROUPS.map((group) => (
              <optgroup key={group.labelKey} label={t(group.labelKey)} className="bg-neutral-900 text-white">
                {group.countries.map((c) => (
                  <option key={c.code} value={c.code} className="bg-neutral-900 text-white">
                    {c.name} ({c.code})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">{tr.currency}</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#00b2fc]"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-neutral-900 text-white">
                {c.symbol} {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          style={{ background: '#00b2fc' }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? tr.saved : tr.save}
        </button>
      </div>
    </div>
  );
}
