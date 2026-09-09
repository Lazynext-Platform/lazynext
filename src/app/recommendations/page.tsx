import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Recommendation Engine — Lazynext',
  description: 'Manage recommendations, feedback, actions, and recommendation models.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecommendationService } from '@/lib/services/recommendation-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { RecommendationDashboard } from './RecommendationDashboard';

export const dynamic = 'force-dynamic';

export default async function RecommendationsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Recommendation Engine</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage recommendations, feedback, actions, and recommendation models.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Sparkles}
            title="No workspace yet"
            description="Create a company first to access the recommendation engine."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [recommendations, feedback, actions, models, metrics, stats] = await Promise.all([
    RecommendationService.listRecommendations(organizationId),
    RecommendationService.listRecommendationFeedbacks(organizationId),
    RecommendationService.listRecommendationActions(organizationId),
    RecommendationService.listRecommendationModels(organizationId),
    RecommendationService.getRecommendationEngineMetrics(organizationId),
    RecommendationService.getRecommendationEngineStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Recommendation Engine</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage recommendations, feedback, actions, and recommendation models.</p>
      </div>

      <RecommendationDashboard
        organizationId={organizationId}
        recommendations={recommendations}
        feedback={feedback}
        actions={actions}
        models={models}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
