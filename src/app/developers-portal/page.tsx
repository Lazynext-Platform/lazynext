import type { Metadata } from 'next';
import { Code } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Developer Portal — Lazynext',
  description: 'API keys, webhooks, SDK generation, and API documentation.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { WebhookSubscriptionService } from '@/lib/services/webhook-subscription-service';
import { ApiUsageLogger } from '@/lib/services/api-usage-logger';
import { SdkGenerator } from '@/lib/services/sdk-generator';
import { Card, Button, EmptyState } from '@/components/ui';
import { DeveloperPortal } from './DeveloperPortal';

export const dynamic = 'force-dynamic';

export default async function DevelopersPortalPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Developer Portal</h1>
          <p className="text-sm text-fg-secondary mt-1">API keys, webhooks, SDK generation, and documentation.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Code}
            title="No workspace yet"
            description="Create a company first to access the developer portal."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [keys, webhooks, usageStats, endpoints] = await Promise.all([
    ApiKeyService.list(organizationId),
    WebhookSubscriptionService.list(organizationId),
    ApiUsageLogger.getUsageStats(organizationId),
    SdkGenerator.getEndpointList(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Code className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Developer Portal</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">API keys, webhooks, SDK generation, and documentation.</p>
      </div>

      <DeveloperPortal
        organizationId={organizationId}
        keys={keys}
        webhooks={webhooks}
        usageStats={usageStats}
        endpoints={endpoints}
      />
    </div>
  );
}
