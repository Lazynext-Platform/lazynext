'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import { Card, Button, Input, Textarea } from '@/components/ui';

const TRIGGER_OPTIONS = [
  { value: 'task.created', label: 'When a task is created' },
  { value: 'task.completed', label: 'When a task is completed' },
  { value: 'document.created', label: 'When a document is created' },
  { value: 'document.updated', label: 'When a document is updated' },
  { value: 'project.created', label: 'When a project is created' },
  { value: 'member.joined', label: 'When a member joins' },
  { value: 'schedule.daily', label: 'Daily at 9:00 AM' },
  { value: 'schedule.weekly', label: 'Weekly on Monday' },
];

export default function NewAutomationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('task.created');
  const [definition, setDefinition] = useState('{\n  "steps": []\n}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), trigger, definition }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create automation');
      }
      router.push('/automations');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create automation');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/automations" className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg mb-4">
        <ArrowLeft className="h-4 w-4" /> All automations
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div
          className="flex h-10 w-10 items-center justify-center border-2"
          style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
        >
          <Zap className="h-5 w-5" />
        </div>
        <h1 className="heading-display text-2xl">New Automation</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label-mono block mb-1">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Notify on task completion"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label-mono block mb-1">Trigger *</label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="w-full border-2 bg-surface px-3 py-2.5 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              {TRIGGER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-mono block mb-1">Definition (JSON)</label>
            <Textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-fg-muted mt-1">Define the automation steps as JSON.</p>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create automation'}
            </Button>
            <Button href="/automations" variant="ghost">Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
