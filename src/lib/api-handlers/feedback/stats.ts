import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { NpsService } from '@/lib/services/nps-service';
import { CsatService } from '@/lib/services/csat-service';
import { FeedbackService } from '@/lib/services/feedback-service';
import { TestimonialService } from '@/lib/services/testimonial-service';
import { ChurnPredictionService } from '@/lib/services/churn-prediction-service';

/** GET /api/feedback/stats — overall feedback stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      nps: { totalSurveys: 0, totalResponses: 0, avgNps: 0, responseRate: 0 },
      csat: { totalSurveys: 0, totalResponses: 0, avgCsat: 0 },
      feedback: { total: 0, bySource: {}, byCategory: {}, avgRating: 0, sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 } },
      testimonials: { total: 0, approved: 0, pending: 0, rejected: 0, avgRating: 0 },
      churn: { totalCustomers: 0, atRisk: 0, byRiskLevel: { low: 0, medium: 0, high: 0 }, avgRiskScore: 0 },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const [nps, csat, feedback, testimonials, churn] = await Promise.all([
    NpsService.getStats(organizationId),
    CsatService.getStats(organizationId),
    FeedbackService.getStats(organizationId),
    TestimonialService.getStats(organizationId),
    ChurnPredictionService.getStats(organizationId),
  ]);

  return NextResponse.json({ nps, csat, feedback, testimonials, churn });
}
