'use client';

import { useState, useEffect } from 'react';
import { Plug, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

interface Integration {
  id: string;
  name: string;
  category: string;
  desc: string;
}

interface Connection {
  id: string;
  platform: string;
  platformUsername: string | null;
}

const INTEGRATION_CATALOG: Integration[] = [
  { id: 'google-ads', name: 'Google Ads', category: 'Advertising', desc: 'Sync campaigns and creative performance' },
  { id: 'meta-ads', name: 'Meta Ads', category: 'Advertising', desc: 'Connect Facebook/Instagram ad accounts' },
  { id: 'tiktok-ads', name: 'TikTok Ads', category: 'Advertising', desc: 'Manage TikTok ad campaigns' },
  { id: 'shopify', name: 'Shopify', category: 'E-commerce', desc: 'Import products and sync orders' },
  { id: 'stripe', name: 'Stripe', category: 'Payments', desc: 'Payment processing and subscriptions' },
  { id: 'dodo-payments', name: 'Dodo Payments', category: 'Payments', desc: 'Alternative payment provider' },
  { id: 'resend', name: 'Resend', category: 'Email', desc: 'Transactional email delivery' },
  { id: 'slack', name: 'Slack', category: 'Communication', desc: 'Send notifications to Slack channels' },
  { id: 'google-drive', name: 'Google Drive', category: 'Storage', desc: 'File storage and sync' },
  { id: 'dropbox', name: 'Dropbox', category: 'Storage', desc: 'Cloud file storage' },
  { id: 'github', name: 'GitHub', category: 'Developer', desc: 'Repository access and code search' },
  { id: 'linear', name: 'Linear', category: 'Developer', desc: 'Issue tracking and project management' },
  { id: 'notion', name: 'Notion', category: 'Knowledge', desc: 'Sync documents and databases' },
  { id: 'figma', name: 'Figma', category: 'Design', desc: 'Design file access and exports' },
  { id: 'zapier', name: 'Zapier', category: 'Automation', desc: 'Connect to 6000+ apps via Zapier' },
  { id: 'webhooks', name: 'Webhooks', category: 'Developer', desc: 'Custom HTTP webhook integrations' },
];

export function IntegrationsManager({ initialConnections }: { initialConnections: Connection[] }) {
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const connectedPlatforms = new Set(connections.map((c) => c.platform.toLowerCase()));
  const categories = [...new Set(INTEGRATION_CATALOG.map((i) => i.category))];

  async function connect(integration: Integration) {
    setConnecting(integration.id);
    setError('');
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: integration.id, platformUsername: integration.name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to connect');
      }
      const { connection } = await res.json();
      setConnections([...connections, connection]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setConnecting(null);
    }
  }

  async function disconnect(platform: string) {
    if (!confirm(`Disconnect ${platform}?`)) return;
    try {
      const res = await fetch(`/api/integrations/${platform}`, { method: 'DELETE' });
      if (res.ok) {
        setConnections(connections.filter((c) => c.platform !== platform));
      }
    } catch {}
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 border-2 text-sm" style={{ borderColor: 'var(--c-danger)', borderRadius: 'var(--radius-sm)', color: 'var(--c-danger)' }}>
          <AlertCircle className="h-4 w-4 inline mr-2" />{error}
        </div>
      )}

      {categories.map((category) => (
        <div key={category} className="mb-8">
          <h2 className="label-mono mb-3">{category}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATION_CATALOG.filter((i) => i.category === category).map((integration) => {
              const isConnected = connectedPlatforms.has(integration.id) || connectedPlatforms.has(integration.id.replace('-', '_'));
              return (
                <Card key={integration.id} className="p-4 flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center border-2 shrink-0"
                    style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <Plug className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold truncate">{integration.name}</p>
                      {isConnected && <Badge variant="success"><Check className="h-3 w-3" /> Connected</Badge>}
                    </div>
                    <p className="text-xs text-fg-secondary mb-3">{integration.desc}</p>
                    {isConnected ? (
                      <Button size="sm" variant="ghost" onClick={() => disconnect(integration.id)}>
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => connect(integration)}
                        disabled={connecting === integration.id}
                      >
                        {connecting === integration.id ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Connecting...</>
                        ) : (
                          'Connect'
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
