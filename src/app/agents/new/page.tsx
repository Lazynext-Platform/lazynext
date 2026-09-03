'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bot } from 'lucide-react';
import Link from 'next/link';
import { Card, Button, Input, Textarea } from '@/components/ui';

const PROVIDERS = [
  { value: 'atlas', label: 'Atlas Cloud' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
];

const MODELS: Record<string, string[]> = {
  atlas: ['doubao-seed-2.1-turbo', 'doubao-pro', 'atlas-flash'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o1'],
  anthropic: ['claude-3.5-sonnet', 'claude-3.5-haiku', 'claude-3-opus'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
};

export default function NewAgentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [modelProvider, setModelProvider] = useState('atlas');
  const [modelName, setModelName] = useState('doubao-seed-2.1-turbo');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), modelProvider, modelName, instructions }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create agent');
      }
      router.replace('/agents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/agents" className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg mb-4">
        <ArrowLeft className="h-4 w-4" /> All agents
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div
          className="flex h-10 w-10 items-center justify-center border-2"
          style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
        >
          <Bot className="h-5 w-5" />
        </div>
        <h1 className="heading-display text-2xl">New AI Agent</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label-mono block mb-1">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Content Writer"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-mono block mb-1">Provider</label>
              <select
                value={modelProvider}
                onChange={(e) => {
                  setModelProvider(e.target.value);
                  setModelName(MODELS[e.target.value]?.[0] || '');
                }}
                className="w-full border-2 bg-surface px-3 py-2.5 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-mono block mb-1">Model</label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full border-2 bg-surface px-3 py-2.5 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                {(MODELS[modelProvider] || []).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-mono block mb-1">Instructions</label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe what this agent should do..."
              rows={6}
            />
            <p className="text-xs text-fg-muted mt-1">The system prompt that defines the agent&apos;s behavior.</p>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create agent'}
            </Button>
            <Button href="/agents" variant="ghost">Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
