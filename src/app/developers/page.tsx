'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Key, Plus, Trash2, Copy, Check, Webhook, Bot, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { Card, Badge, Button, Input, EmptyState, Dialog } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export default function DevelopersPage() {
  const { status } = useSession();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (status !== 'authenticated') { setLoading(false); return; }
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName, scopes: newKeyScopes }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.key);
        setKeys([...keys, { id: data.id, name: data.name, keyPrefix: data.keyPrefix, scopes: data.scopes, lastUsedAt: null, createdAt: data.createdAt }]);
        setNewKeyName('');
        setNewKeyScopes(['read']);
        toast('success', 'API key created');
      } else {
        toast('error', 'Failed to create key');
      }
    } catch {
      toast('error', 'Failed to create key');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys(keys.filter((k) => k.id !== id));
        toast('success', 'API key revoked');
      }
    } catch {
      toast('error', 'Failed to revoke key');
    }
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status !== 'authenticated') {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Developer</h1>
        <p className="text-sm text-fg-secondary mt-1">API keys, MCP server, and webhooks</p>
      </div>

      {/* API Keys section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-display text-sm flex items-center gap-2">
            <Key className="h-4 w-4" /> API Keys
          </h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Key
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
          </div>
        ) : keys.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={Key}
              title="No API keys yet"
              description="Create an API key to access the Lazynext REST API and MCP server."
              action={<Button size="sm" onClick={() => setCreateOpen(true)}>Create key</Button>}
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {keys.map((k) => (
              <Card key={k.id} className="p-4 flex items-center gap-4">
                <div
                  className="flex h-10 w-10 items-center justify-center border-2 shrink-0"
                  style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                >
                  <Key className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{k.name}</p>
                  <p className="text-xs text-fg-muted font-mono">{k.keyPrefix}...</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {k.scopes.map((s) => <Badge key={s}>{s}</Badge>)}
                  <span className="text-xs text-fg-muted hidden sm:block">
                    {k.lastUsedAt ? `Used ${new Date(k.lastUsedAt).toLocaleDateString()}` : 'Never used'}
                  </span>
                  <button
                    onClick={() => handleRevoke(k.id)}
                    className="p-1.5 border-2 hover:bg-hover transition-colors"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                    aria-label="Revoke key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* MCP section */}
      <div className="mb-8">
        <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
          <Bot className="h-4 w-4" /> MCP Server
        </h2>
        <Card className="p-5">
          <div className="flex items-start gap-4 mb-4">
            <div
              className="flex h-10 w-10 items-center justify-center border-2 shrink-0"
              style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
            >
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Model Context Protocol</p>
              <p className="text-xs text-fg-secondary mt-1">
                Protocol version <Badge>2026-07-28</Badge>
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <p className="label-mono">Endpoint</p>
                <p className="text-sm font-mono">/mcp</p>
              </div>
              <a href="/mcp" target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-fg">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="flex items-center justify-between p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <p className="label-mono">OAuth Protected Resource</p>
                <p className="text-sm font-mono">/.well-known/oauth-protected-resource</p>
              </div>
              <a href="/.well-known/oauth-protected-resource" target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-fg">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </Card>
      </div>

      {/* REST API section */}
      <div className="mb-8">
        <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4" /> REST API v1
        </h2>
        <Card className="p-5">
          <div className="flex items-start gap-4 mb-4">
            <div
              className="flex h-10 w-10 items-center justify-center border-2 shrink-0"
              style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
            >
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Public REST API</p>
              <p className="text-xs text-fg-secondary mt-1">Version <Badge>1.0.0</Badge></p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <p className="label-mono">Base URL</p>
                <p className="text-sm font-mono">/api/v1</p>
              </div>
              <a href="/api/v1" target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-fg">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
              <p className="label-mono mb-2">Authentication</p>
              <p className="text-xs font-mono">Authorization: Bearer ln_live_...</p>
            </div>
            <div className="p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
              <p className="label-mono mb-2">Rate Limit</p>
              <p className="text-xs">100 requests per minute per IP</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Webhooks section */}
      <div>
        <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
          <Webhook className="h-4 w-4" /> Webhooks
        </h2>
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div
              className="flex h-10 w-10 items-center justify-center border-2 shrink-0"
              style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
            >
              <Webhook className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Webhook Endpoints</p>
              <p className="text-xs text-fg-secondary mt-1">
                Manage webhook endpoints for event delivery.
              </p>
            </div>
            <Button href="/api/webhooks" size="sm">Manage</Button>
          </div>
        </Card>
      </div>

      {/* Create key dialog */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setCreatedKey(null); }} title={createdKey ? 'API Key Created' : 'Create API Key'}>
        {createdKey ? (
          <div className="space-y-4">
            <p className="text-sm text-fg-secondary">
              Copy your API key now. You will not be able to see it again.
            </p>
            <div className="flex items-center gap-2 p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
              <code className="text-xs font-mono flex-1 break-all">{createdKey}</code>
              <button onClick={copyKey} className="p-2 border-2 hover:bg-hover" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <Button onClick={() => { setCreateOpen(false); setCreatedKey(null); }} className="w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label-mono block mb-2">Name</label>
              <Input
                placeholder="e.g. Production bot"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div>
              <label className="label-mono block mb-2">Scopes</label>
              <div className="flex gap-2">
                {['read', 'write', 'admin'].map((scope) => (
                  <button
                    key={scope}
                    onClick={() => {
                      if (newKeyScopes.includes(scope)) {
                        setNewKeyScopes(newKeyScopes.filter((s) => s !== scope));
                      } else {
                        setNewKeyScopes([...newKeyScopes, scope]);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-mono border-2"
                    style={{
                      borderColor: 'var(--c-ink)',
                      backgroundColor: newKeyScopes.includes(scope) ? 'var(--c-ink)' : 'var(--c-surface)',
                      color: newKeyScopes.includes(scope) ? 'var(--c-surface)' : 'var(--c-fg)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {scope.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={!newKeyName.trim()}>
              Create Key
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
