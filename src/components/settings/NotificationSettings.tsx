'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, Check } from 'lucide-react';
import { Card, Button, Switch } from '@/components/ui';

interface NotificationPref {
  key: string;
  label: string;
  desc: string;
  inApp: boolean;
  email: boolean;
}

const PREF_DEFINITIONS = [
  { key: 'task_assigned', label: 'Task assigned', desc: 'When a task is assigned to you' },
  { key: 'task_completed', label: 'Task completed', desc: 'When a task you created is completed' },
  { key: 'project_created', label: 'Project created', desc: 'When a new project is created in your workspace' },
  { key: 'document_shared', label: 'Document shared', desc: 'When a document is shared with you' },
  { key: 'mention', label: 'Mentions', desc: 'When you are mentioned in a comment or message' },
  { key: 'comment', label: 'Comments', desc: 'When someone comments on your work' },
  { key: 'billing', label: 'Billing reminders', desc: 'Low credits or payment issues' },
  { key: 'system', label: 'System alerts', desc: 'Security and platform notifications' },
];

const DEFAULT_PREFS: NotificationPref[] = PREF_DEFINITIONS.map((d) => ({
  ...d,
  inApp: true,
  email: false,
}));

export function NotificationSettings() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPrefs = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/notifications');
      if (res.ok) {
        const data = await res.json();
        const serverPrefs = data.prefs || {};
        setPrefs(
          PREF_DEFINITIONS.map((d) => ({
            ...d,
            inApp: serverPrefs[d.key]?.inApp ?? true,
            email: serverPrefs[d.key]?.email ?? false,
          })),
        );
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  function toggle(key: string, field: 'inApp' | 'email') {
    setPrefs((prev) =>
      prev.map((p) => (p.key === key ? { ...p, [field]: !p[field] } : p)),
    );
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const payload: Record<string, { inApp: boolean; email: boolean }> = {};
      for (const p of prefs) {
        payload[p.key] = { inApp: p.inApp, email: p.email };
      }
      const res = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {} finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 border-b-2" style={{ borderColor: 'var(--c-ink)' }}>
          <span className="label-mono text-xs">Notification type</span>
          <span className="label-mono text-xs w-16 text-center">In-app</span>
          <span className="label-mono text-xs w-16 text-center">Email</span>
        </div>
        {prefs.map((p) => (
          <div key={p.key} className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 border-b-2 last:border-0 items-center" style={{ borderColor: 'var(--c-ink)' }}>
            <div>
              <p className="text-sm font-semibold">{p.label}</p>
              <p className="text-xs text-fg-muted">{p.desc}</p>
            </div>
            <div className="flex justify-center w-16">
              <Switch checked={p.inApp} onChange={() => toggle(p.key, 'inApp')} />
            </div>
            <div className="flex justify-center w-16">
              <Switch checked={p.email} onChange={() => toggle(p.key, 'email')} />
            </div>
          </div>
        ))}
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save preferences</>}
        </Button>
        <p className="text-xs text-fg-muted">Email notifications require a verified email address.</p>
      </div>
    </div>
  );
}
