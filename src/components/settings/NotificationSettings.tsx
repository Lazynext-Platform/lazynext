'use client';

import { useState } from 'react';
import { Bell, Mail, MessageSquare, Zap, Save, Loader2, Check } from 'lucide-react';
import { Card, Button, Switch } from '@/components/ui';

interface NotificationPref {
  key: string;
  label: string;
  desc: string;
  inApp: boolean;
  email: boolean;
}

const DEFAULT_PREFS: NotificationPref[] = [
  { key: 'task_assigned', label: 'Task assigned', desc: 'When a task is assigned to you', inApp: true, email: true },
  { key: 'task_completed', label: 'Task completed', desc: 'When a task you created is completed', inApp: true, email: false },
  { key: 'document_shared', label: 'Document shared', desc: 'When a document is shared with you', inApp: true, email: true },
  { key: 'member_joined', label: 'Member joined', desc: 'When a new member joins your workspace', inApp: true, email: false },
  { key: 'automation_failed', label: 'Automation failed', desc: 'When an automation run fails', inApp: true, email: true },
  { key: 'agent_completed', label: 'Agent completed', desc: 'When an AI agent finishes a run', inApp: true, email: false },
  { key: 'billing_reminder', label: 'Billing reminder', desc: 'Low credits or payment issues', inApp: true, email: true },
  { key: 'security_alert', label: 'Security alert', desc: 'Suspicious activity on your account', inApp: true, email: true },
];

export function NotificationSettings() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(key: string, field: 'inApp' | 'email') {
    setPrefs((prev) =>
      prev.map((p) => (p.key === key ? { ...p, [field]: !p[field] } : p)),
    );
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    // Store in localStorage as a simple persistence mechanism
    // In production, this would be saved via API to user preferences
    localStorage.setItem('notification-prefs', JSON.stringify(prefs));
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 500);
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
