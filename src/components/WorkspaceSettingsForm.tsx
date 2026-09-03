'use client';

import { useState } from 'react';
import { Settings, Save, Loader2, Check, AlertCircle } from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';

export function WorkspaceSettingsForm({ workspaceId, initialName, initialLocale, initialTimezone }: { workspaceId: string; initialName: string; initialLocale: string; initialTimezone: string }) {
  const [name, setName] = useState(initialName);
  const [locale, setLocale] = useState(initialLocale);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const LOCALES = ['en', 'zh', 'ja', 'es', 'ko', 'pt', 'fr', 'de', 'ar', 'hi'];
  const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Kolkata', 'Asia/Seoul', 'Asia/Dubai', 'Australia/Sydney'];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: workspaceId, name, defaultLocale: locale, timezone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={save} className="flex flex-col gap-4">
        <div>
          <label className="label-mono block mb-1">Workspace name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-mono block mb-1">Default locale</label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full border-2 bg-surface px-3 py-2.5 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label-mono block mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full border-2 bg-surface px-3 py-2.5 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-danger flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {error}</p>}
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save changes</>}
        </Button>
      </form>
    </Card>
  );
}
