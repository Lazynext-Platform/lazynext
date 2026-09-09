import type { Metadata } from 'next';
import { MessageSquare } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Customer Feedback — Lazynext',
  description: 'NPS surveys, CSAT tracking, feedback collection, sentiment analysis, churn prediction, and testimonial management.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { NpsService } from '@/lib/services/nps-service';
import { CsatService } from '@/lib/services/csat-service';
import { FeedbackService } from '@/lib/services/feedback-service';
import { TestimonialService } from '@/lib/services/testimonial-service';
import { ChurnPredictionService } from '@/lib/services/churn-prediction-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { FeedbackDashboard } from './FeedbackDashboard';

export const dynamic = 'force-dynamic';

export default async function FeedbackPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Customer Feedback</h1>
          <p className="text-sm text-fg-secondary mt-1">NPS, CSAT, feedback, churn prediction, and testimonials.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={MessageSquare}
            title="No workspace yet"
            description="Create a company first to access customer feedback tools."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [npsStats, csatStats, feedbackStats, testimonialStats, churnStats, npsSurveys, csatSurveys, feedback, testimonials, atRisk] = await Promise.all([
    NpsService.getStats(organizationId),
    CsatService.getStats(organizationId),
    FeedbackService.getStats(organizationId),
    TestimonialService.getStats(organizationId),
    ChurnPredictionService.getStats(organizationId),
    NpsService.listSurveys(organizationId),
    CsatService.listSurveys(organizationId),
    FeedbackService.list(organizationId),
    TestimonialService.list(organizationId),
    ChurnPredictionService.getAtRiskCustomers(organizationId, 30),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Customer Feedback</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">NPS, CSAT, feedback, churn prediction, and testimonials.</p>
      </div>

      <FeedbackDashboard
        organizationId={organizationId}
        npsStats={npsStats}
        csatStats={csatStats}
        feedbackStats={feedbackStats}
        testimonialStats={testimonialStats}
        churnStats={churnStats}
        npsSurveys={npsSurveys}
        csatSurveys={csatSurveys}
        feedback={feedback}
        testimonials={testimonials}
        atRiskCustomers={atRisk}
      />
    </div>
  );
}
