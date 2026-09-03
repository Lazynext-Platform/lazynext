import { Card, Badge } from '@/components/ui';
import { Webhook, Key, Database, Shield, Zap, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

const API_ENDPOINTS = [
  // Workspaces
  { method: 'GET', path: '/api/workspaces', desc: 'List user workspaces', auth: 'session' },
  { method: 'PATCH', path: '/api/workspaces', desc: 'Update workspace settings', auth: 'session+owner' },
  // Projects
  { method: 'GET', path: '/api/projects', desc: 'List projects', auth: 'session' },
  { method: 'POST', path: '/api/projects', desc: 'Create project', auth: 'session' },
  { method: 'GET', path: '/api/projects/[id]', desc: 'Get project by ID', auth: 'session' },
  { method: 'PATCH', path: '/api/projects/[id]', desc: 'Update project', auth: 'session' },
  { method: 'DELETE', path: '/api/projects/[id]', desc: 'Delete project', auth: 'session' },
  // Tasks
  { method: 'GET', path: '/api/tasks', desc: 'List tasks', auth: 'session' },
  { method: 'POST', path: '/api/tasks', desc: 'Create task', auth: 'session' },
  { method: 'PATCH', path: '/api/tasks/[id]', desc: 'Update task status', auth: 'session' },
  // Documents
  { method: 'GET', path: '/api/documents', desc: 'List documents', auth: 'session' },
  { method: 'POST', path: '/api/documents', desc: 'Create document', auth: 'session' },
  { method: 'GET', path: '/api/documents/[id]', desc: 'Get document', auth: 'session' },
  { method: 'PATCH', path: '/api/documents/[id]', desc: 'Update document', auth: 'session' },
  // Automations
  { method: 'GET', path: '/api/automations', desc: 'List automations', auth: 'session' },
  { method: 'POST', path: '/api/automations', desc: 'Create automation', auth: 'session' },
  // Agents
  { method: 'GET', path: '/api/agents', desc: 'List agents', auth: 'session' },
  { method: 'POST', path: '/api/agents', desc: 'Create agent', auth: 'session' },
  // Files
  { method: 'POST', path: '/api/files/upload', desc: 'Upload file to R2', auth: 'session' },
  // Notifications
  { method: 'GET', path: '/api/notifications', desc: 'List notifications', auth: 'session' },
  { method: 'POST', path: '/api/notifications', desc: 'Create notification', auth: 'session' },
  { method: 'GET', path: '/api/notifications/stream', desc: 'SSE stream for real-time notifications', auth: 'session' },
  { method: 'PATCH', path: '/api/notifications/[id]', desc: 'Mark notification read/unread', auth: 'session' },
  { method: 'DELETE', path: '/api/notifications/[id]', desc: 'Delete notification', auth: 'session' },
  { method: 'POST', path: '/api/notifications/read-all', desc: 'Mark all notifications read', auth: 'session' },
  // Conversations
  { method: 'GET', path: '/api/conversations', desc: 'List conversations', auth: 'session' },
  { method: 'POST', path: '/api/conversations', desc: 'Create conversation', auth: 'session' },
  { method: 'GET', path: '/api/conversations/[id]/messages', desc: 'List messages', auth: 'session' },
  { method: 'POST', path: '/api/conversations/[id]/messages', desc: 'Send message', auth: 'session' },
  // Admin
  { method: 'GET', path: '/api/admin/members', desc: 'List workspace members', auth: 'session' },
  { method: 'POST', path: '/api/admin/members', desc: 'Invite member', auth: 'session+owner/admin' },
  { method: 'PATCH', path: '/api/admin/members/[id]', desc: 'Change member role', auth: 'session+owner/admin' },
  { method: 'DELETE', path: '/api/admin/members/[id]', desc: 'Remove member', auth: 'session+owner/admin' },
  // Integrations
  { method: 'GET', path: '/api/integrations', desc: 'List integrations', auth: 'session' },
  { method: 'POST', path: '/api/integrations', desc: 'Connect integration', auth: 'session' },
  { method: 'DELETE', path: '/api/integrations/[platform]', desc: 'Disconnect integration', auth: 'session' },
  // Settings
  { method: 'PATCH', path: '/api/settings/profile', desc: 'Update profile', auth: 'session' },
  { method: 'POST', path: '/api/settings/password', desc: 'Change password', auth: 'session' },
  // Billing
  { method: 'POST', path: '/api/checkout', desc: 'Create Dodo Payments checkout', auth: 'session' },
  // API v1
  { method: 'GET', path: '/api/v1', desc: 'API v1 root — OpenAPI spec', auth: 'api_key' },
  { method: 'GET', path: '/api/v1/workspaces', desc: 'List workspaces (API v1)', auth: 'api_key' },
  { method: 'GET', path: '/api/v1/workspaces/[id]/projects', desc: 'List projects (API v1)', auth: 'api_key' },
  { method: 'GET', path: '/api/v1/workspaces/[id]/documents', desc: 'List documents (API v1)', auth: 'api_key' },
  // MCP
  { method: 'GET', path: '/.well-known/oauth-protected-resource', desc: 'OAuth protected resource metadata', auth: 'none' },
  // Health
  { method: 'GET', path: '/api/health', desc: 'Health check', auth: 'none' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: '#22c55e',
  POST: '#00b2fc',
  PATCH: '#f97316',
  DELETE: '#ef4444',
};

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">API Documentation</h1>
        <p className="text-sm text-fg-secondary mt-1">
          {API_ENDPOINTS.length} endpoints across the Lazynext OS platform
        </p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <Card className="p-4">
          <Key className="h-5 w-5 mb-2 text-fg-muted" />
          <p className="heading-display text-lg">{API_ENDPOINTS.filter((e) => e.auth === 'api_key').length}</p>
          <p className="label-mono">API Key</p>
        </Card>
        <Card className="p-4">
          <Shield className="h-5 w-5 mb-2 text-fg-muted" />
          <p className="heading-display text-lg">{API_ENDPOINTS.filter((e) => e.auth === 'session').length}</p>
          <p className="label-mono">Session</p>
        </Card>
        <Card className="p-4">
          <Zap className="h-5 w-5 mb-2 text-fg-muted" />
          <p className="heading-display text-lg">{API_ENDPOINTS.filter((e) => e.auth === 'none').length}</p>
          <p className="label-mono">Public</p>
        </Card>
        <Card className="p-4">
          <FileText className="h-5 w-5 mb-2 text-fg-muted" />
          <p className="heading-display text-lg">{API_ENDPOINTS.length}</p>
          <p className="label-mono">Total</p>
        </Card>
      </div>

      {/* Authentication info */}
      <Card className="p-6 mb-6">
        <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
          <Key className="h-5 w-5" /> Authentication
        </h2>
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <Badge variant="success">session</Badge>
            <span className="ml-2 text-fg-secondary">NextAuth JWT session cookie. Used by the web UI.</span>
          </div>
          <div>
            <Badge>api_key</Badge>
            <span className="ml-2 text-fg-secondary">Bearer token via <code className="font-mono text-xs">Authorization: Bearer ln_...</code>. Create keys at <a href="/developers" className="underline">/developers</a>.</span>
          </div>
          <div>
            <Badge variant="default">session+owner</Badge>
            <span className="ml-2 text-fg-secondary">Session auth + workspace owner/admin role check.</span>
          </div>
          <div>
            <Badge variant="default">none</Badge>
            <span className="ml-2 text-fg-secondary">No authentication required.</span>
          </div>
        </div>
      </Card>

      {/* Rate limiting info */}
      <Card className="p-6 mb-6">
        <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5" /> Rate Limiting
        </h2>
        <div className="flex flex-col gap-2 text-sm text-fg-secondary">
          <p>API requests: <strong>60 requests per 60 seconds</strong> per IP</p>
          <p>AI generation requests: <strong>10 requests per 60 seconds</strong> per user</p>
          <p>Rate limit headers are included in all API responses.</p>
        </div>
      </Card>

      {/* Endpoints table */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--c-ink)' }}>
          <h2 className="heading-display text-sm">Endpoints</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2" style={{ borderColor: 'var(--c-ink)' }}>
              <th className="label-mono text-left px-4 py-3 w-20">Method</th>
              <th className="label-mono text-left px-4 py-3">Path</th>
              <th className="label-mono text-left px-4 py-3 hidden sm:table-cell">Description</th>
              <th className="label-mono text-left px-4 py-3 w-32">Auth</th>
            </tr>
          </thead>
          <tbody>
            {API_ENDPOINTS.map((ep, i) => (
              <tr key={i} className="border-b-2 last:border-0 hover:bg-hover transition-colors" style={{ borderColor: 'var(--c-ink)' }}>
                <td className="px-4 py-3">
                  <span
                    className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: METHOD_COLORS[ep.method] + '20', color: METHOD_COLORS[ep.method] }}
                  >
                    {ep.method}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{ep.path}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-fg-secondary">{ep.desc}</td>
                <td className="px-4 py-3">
                  <Badge>{ep.auth}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Links */}
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="/api/v1" className="text-sm underline hover:text-fg">View OpenAPI spec (JSON)</a>
        <span className="text-fg-muted">·</span>
        <a href="/developers" className="text-sm underline hover:text-fg">Manage API keys</a>
        <span className="text-fg-muted">·</span>
        <a href="/mcp" className="text-sm underline hover:text-fg">MCP server info</a>
        <span className="text-fg-muted">·</span>
        <a href="/api-terms" className="text-sm underline hover:text-fg">API Terms</a>
      </div>
    </div>
  );
}
