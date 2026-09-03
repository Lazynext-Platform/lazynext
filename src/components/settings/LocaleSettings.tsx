'use client';

import { useState, useEffect } from 'react';
import { Globe, Save, Loader2, Check } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useI18n } from '@/i18n/provider';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/messages';

export function LocaleSettings({ userLocale, userCountry }: { userLocale: string; userCountry: string }) {
  const { setLocale, locale: currentLocale } = useI18n();
  const [selectedLocale, setSelectedLocale] = useState<Locale>((userLocale as Locale) || currentLocale);
  const [country, setCountry] = useState(userCountry || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      // Update locale via the i18n provider (sets cookie)
      setLocale(selectedLocale);
      // Save preferences via the me/preferences API
      await fetch('/api/me/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: selectedLocale, country: country.toUpperCase() }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5" /> Language
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => setSelectedLocale(l)}
              className="p-3 border-2 text-sm text-left transition"
              style={{
                borderColor: 'var(--c-ink)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: selectedLocale === l ? 'var(--c-active)' : 'var(--c-surface)',
              }}
            >
              {LOCALE_NAMES[l]}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="heading-display text-lg mb-4">Region</h2>
        <div>
          <label className="label-mono block mb-1">Country</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. US, JP, BR"
            maxLength={2}
            className="w-full border-2 bg-surface px-3 py-2.5 text-sm uppercase"
            style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
          />
          <p className="text-xs text-fg-muted mt-1">ISO 3166-1 alpha-2 code. Currency is auto-detected from country.</p>
        </div>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save preferences</>}
      </Button>
    </div>
  );
}
