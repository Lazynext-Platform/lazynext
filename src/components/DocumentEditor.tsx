'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Save, X, Trash2 } from 'lucide-react';
import { Card, Button, Input, Textarea, Badge } from '@/components/ui';

interface DocumentEditorProps {
  doc: {
    id: string;
    title: string;
    content: string;
    version: number;
  };
}

export function DocumentEditor({ doc }: DocumentEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/documents');
        router.refresh();
      }
    } catch {}
  }

  function handleCancel() {
    setTitle(doc.title);
    setContent(doc.content);
    setEditing(false);
    setError('');
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Badge>v{doc.version}</Badge>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-semibold"
        />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={24}
          className="font-mono text-sm"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Badge>v{doc.version}</Badge>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Edit className="h-4 w-4" /> Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>
      <Card className="p-6">
        <div className="prose prose-sm max-w-none">
          {doc.content ? (
            <pre className="whitespace-pre-wrap text-sm font-sans">{doc.content}</pre>
          ) : (
            <p className="text-fg-muted">This document is empty. Click &ldquo;Edit&rdquo; to add content.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
