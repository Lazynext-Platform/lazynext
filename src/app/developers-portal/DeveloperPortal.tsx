'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Key, Webhook, Code, BookOpen, Copy, Plus, Trash2, Pause, Play, Send,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

interface ApiKeyRecord {
  id: string; name: string; keyPrefix: string; scopes: string; rateLimitPerMin: number;
  rateLimitPerDay: number; lastUsedAt: Date | null; expiresAt: Date | null; revokedAt: Date | null;
  createdAt: Date;
}
interface WebhookRecord {
  id: string; name: string; url: string; events: string; status: string;
  successCount: number; failureCount: number; lastDeliveryAt: Date | null;
}
interface UsageStats {
  totalRequests: number; errorRate: number; avgResponseTime: number;
}
interface EndpointCategory {
  category: string; endpoints: Array<{ method: string; path: string; description: string }>;
}

export function DeveloperPortal({
  organizationId,
  keys: initialKeys,
  webhooks: initialWebhooks,
  usageStats,
  endpoints,
}: {
  organizationId: string;
  keys: ApiKeyRecord[];
  webhooks: WebhookRecord[];
  usageStats: UsageStats;
  endpoints: EndpointCategory[];
}) {
  const router = useRouter();
  const [keys] = useState(initialKeys);
  const [webhooks] = useState(initialWebhooks);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGenerateSdk() {
    setLoading(true);
    try {
      const res = await fetch('/api/platform/sdk/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      });
      const data = await res.json();
      if (data.code) setGeneratedCode(data.code);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
    active: 'success', paused: 'warning', disabled: 'danger',
  };

  return (
    <div className="space-y-6">
      {/* Usage Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Total Requests</div>
          <div className="text-2xl font-bold">{usageStats.totalRequests?.toLocaleString() || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Error Rate</div>
          <div className="text-2xl font-bold">{(usageStats.errorRate || 0).toFixed(1)}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-fg-secondary mb-1">Avg Response</div>
          <div className="text-2xl font-bold">{usageStats.avgResponseTime || 0}ms</div>
        </Card>
      </div>

      {/* API Keys */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">API Keys</h2>
            <Badge variant="default" className="text-xs">{keys.length}</Badge>
          </div>
          <Button variant="primary" onClick={() => router.refresh()}>
            <Plus className="h-4 w-4" /> New Key
          </Button>
        </div>
        {keys.length === 0 ? (
          <Card className="p-6"><div className="text-sm text-fg-secondary">No API keys yet.</div></Card>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <Card key={key.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{key.name}</span>
                  <code className="text-xs text-fg-secondary">{key.keyPrefix}...</code>
                  {key.revokedAt && <Badge variant="danger" className="text-xs">Revoked</Badge>}
                </div>
                <div className="flex items-center gap-2 text-xs text-fg-secondary">
                  <span>{key.rateLimitPerMin}/min</span>
                  <span>{key.rateLimitPerDay}/day</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Webhooks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Webhooks</h2>
            <Badge variant="default" className="text-xs">{webhooks.length}</Badge>
          </div>
        </div>
        {webhooks.length === 0 ? (
          <Card className="p-6"><div className="text-sm text-fg-secondary">No webhook subscriptions yet.</div></Card>
        ) : (
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <Card key={wh.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{wh.name}</span>
                  <Badge variant={statusVariant[wh.status] || 'default'} className="text-xs">{wh.status}</Badge>
                  <span className="text-xs text-fg-secondary">{wh.successCount}ok / {wh.failureCount}fail</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" className="text-xs"><Send className="h-3 w-3" /> Test</Button>
                  {wh.status === 'active' ? (
                    <Button variant="ghost" className="text-xs"><Pause className="h-3 w-3" /> Pause</Button>
                  ) : (
                    <Button variant="ghost" className="text-xs"><Play className="h-3 w-3" /> Resume</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SDK Generator */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Code className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">SDK Generator</h2>
        </div>
        <Card className="p-4">
          <div className="flex gap-2 mb-3">
            {['javascript', 'python', 'go', 'curl', 'rust'].map((lang) => (
              <Button
                key={lang}
                variant={selectedLanguage === lang ? 'primary' : 'secondary'}
                onClick={() => setSelectedLanguage(lang)}
                className="text-xs"
              >
                {lang}
              </Button>
            ))}
            <Button onClick={handleGenerateSdk} disabled={loading} variant="primary" className="text-xs">
              Generate
            </Button>
          </div>
          {generatedCode && (
            <div className="relative">
              <pre className="bg-fg-muted/10 rounded-lg p-4 text-xs overflow-x-auto max-h-96"><code>{generatedCode}</code></pre>
              <Button
                variant="ghost"
                onClick={() => copyToClipboard(generatedCode)}
                className="absolute top-2 right-2 text-xs"
              >
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* API Documentation */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-accent-primary" />
          <h2 className="heading-display text-sm">API Endpoints</h2>
        </div>
        <div className="space-y-3">
          {endpoints.map((cat) => (
            <Card key={cat.category} className="p-4">
              <h3 className="text-sm font-medium mb-2">{cat.category}</h3>
              <div className="space-y-1">
                {cat.endpoints.map((ep, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <Badge variant={ep.method === 'GET' ? 'success' : ep.method === 'POST' ? 'info' : 'warning'} className="text-xs">
                      {ep.method}
                    </Badge>
                    <code className="text-fg-secondary">{ep.path}</code>
                    <span className="text-fg-muted">{ep.description}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
