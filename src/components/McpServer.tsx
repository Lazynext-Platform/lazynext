'use client';

import { useState, useCallback, useEffect } from 'react';
import { Server, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface ServerManifest {
  server: { name: string; version: string; protocolVersion: string };
  tools: Array<{ name: string; description: string; annotations?: { cost: number; capabilities: string[]; category: string } }>;
  resources: Array<{ uri: string; name: string; description: string }>;
  toolCount: number;
  resourceCount: number;
}

export function McpServer() {
  const { t } = useI18n();
  const [manifest, setManifest] = useState<ServerManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState<string>('');

  const fetchManifest = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/creative/mcp-server');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setManifest(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchManifest(); }, [fetchManifest]);

  const testPing = useCallback(async () => {
    setTestResult('');
    try {
      const res = await fetch('/api/creative/mcp-server', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
      });
      const data = await res.json();
      setTestResult(data.result ? 'Ping successful — server is responsive.' : 'Ping failed.');
    } catch (e) {
      setTestResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const testToolsList = useCallback(async () => {
    setTestResult('');
    try {
      const res = await fetch('/api/creative/mcp-server', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
      });
      const data = await res.json();
      setTestResult(data.result?.tools ? `Found ${data.result.tools.length} tools.` : 'Tools list failed.');
    } catch (e) {
      setTestResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Server className="w-5 h-5" /> {t('mcpServer.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('mcpServer.subtitle')}</p>
      </div>

      {error && <div role="alert" className="text-danger text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      {loading && <div className="flex items-center gap-2 text-sm text-fg-muted"><Loader2 className="w-4 h-4 animate-spin" /> {t('mcpServer.loading')}</div>}

      {manifest && (
        <div className="space-y-4" role="status">
          {/* Server Info */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm font-semibold">{t('mcpServer.serverInfo')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-fg-muted">
              <div><span className="text-fg-muted">Name: </span><span className="font-medium text-fg-primary">{manifest.server.name}</span></div>
              <div><span className="text-fg-muted">Version: </span><span className="font-medium text-fg-primary">{manifest.server.version}</span></div>
              <div><span className="text-fg-muted">Protocol: </span><span className="font-medium text-fg-primary">{manifest.server.protocolVersion}</span></div>
              <div><span className="text-fg-muted">Tools: </span><span className="font-medium text-fg-primary">{manifest.toolCount}</span></div>
            </div>
          </div>

          {/* Endpoint */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <h3 className="text-sm font-semibold mb-2">{t('mcpServer.endpoint')}</h3>
            <code className="block text-xs bg-bg-primary rounded p-2 overflow-x-auto">POST /api/creative/mcp-server</code>
            <p className="text-xs text-fg-muted mt-2">{t('mcpServer.endpointDescription')}</p>
          </div>

          {/* Protocol Tests */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4 space-y-2">
            <h3 className="text-sm font-semibold">{t('mcpServer.protocolTests')}</h3>
            <div className="flex gap-2 flex-wrap">
              <button onClick={testPing} className="rounded-lg bg-bg-primary px-3 py-1.5 text-xs font-medium hover:opacity-80" aria-label={t('mcpServer.testPing')}>{t('mcpServer.testPing')}</button>
              <button onClick={testToolsList} className="rounded-lg bg-bg-primary px-3 py-1.5 text-xs font-medium hover:opacity-80" aria-label={t('mcpServer.testToolsList')}>{t('mcpServer.testToolsList')}</button>
            </div>
            {testResult && <p className="text-xs text-fg-muted mt-1">{testResult}</p>}
          </div>

          {/* Tools */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <h3 className="text-sm font-semibold mb-2">{t('mcpServer.availableTools')} ({manifest.toolCount})</h3>
            <div className="space-y-2">
              {manifest.tools.map((tool, i) => (
                <div key={i} className="border-l-2 border-border pl-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <code className="text-xs font-medium">{tool.name}</code>
                    {tool.annotations && (
                      <div className="flex gap-1 text-xs">
                        <span className="rounded bg-bg-primary px-1.5 py-0.5">{tool.annotations.cost} {t('mcpServer.credits')}</span>
                        <span className="rounded bg-bg-primary px-1.5 py-0.5 capitalize">{tool.annotations.category}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-fg-muted mt-0.5">{tool.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <h3 className="text-sm font-semibold mb-2">{t('mcpServer.resources')} ({manifest.resourceCount})</h3>
            <div className="space-y-1">
              {manifest.resources.map((res, i) => (
                <div key={i} className="text-xs">
                  <code className="font-medium">{res.uri}</code>
                  <span className="text-fg-muted"> — {res.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Example Usage */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <h3 className="text-sm font-semibold mb-2">{t('mcpServer.exampleUsage')}</h3>
            <pre className="text-xs bg-bg-primary rounded p-3 overflow-x-auto"><code>{`// List tools
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}

// Call a tool
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "creative.generateBrief",
    "arguments": { "product": "..." }
  }
}`}</code></pre>
          </div>
        </div>
      )}
    </div>
  );
}
