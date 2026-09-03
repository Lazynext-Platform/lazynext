'use client';

import { useState } from 'react';
import { User, Save, Loader2, Check } from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';

export function ProfileSettings({ initialName, initialImage, email }: { initialName: string; initialImage: string | null; email: string }) {
  const [name, setName] = useState(initialName);
  const [image, setImage] = useState(initialImage || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image: image || undefined }),
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
          <label className="label-mono block mb-1">Display name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label className="label-mono block mb-1">Email (read-only)</label>
          <Input value={email} disabled className="opacity-60" />
        </div>
        <div>
          <label className="label-mono block mb-1">Avatar URL</label>
          <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." type="url" />
          {image && (
            <img src={image} alt="Avatar preview" className="mt-2 h-12 w-12 rounded-[var(--radius-sm)] border-2" style={{ borderColor: 'var(--c-ink)' }} />
          )}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save changes</>}
          </Button>
        </div>
      </form>
    </Card>
  );
}
