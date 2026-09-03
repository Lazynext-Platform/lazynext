import Link from 'next/link';
import { Plug, Check, AlertCircle } from 'lucide-react';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

const INTEGRATION_CATALOG = [
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

export default async function IntegrationsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  // Check existing connections
  const connections = await prisma.platformConnection.findMany({
    where: { userId: session.user.id },
    select: { platform: true },
  });
  const connectedPlatforms = new Set(connections.map((c) => c.platform.toLowerCase()));

  // Group by category
  const categories = [...new Set(INTEGRATION_CATALOG.map((i) => i.category))];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Integrations</h1>
        <p className="text-sm text-fg-secondary mt-1">
          {connectedPlatforms.size} connected · {INTEGRATION_CATALOG.length} available
        </p>
      </div>

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
                    <p className="text-xs text-fg-secondary">{integration.desc}</p>
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
