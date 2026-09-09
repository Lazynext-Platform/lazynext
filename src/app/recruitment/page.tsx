import type { Metadata } from 'next';
import { Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Recruitment & ATS — Lazynext',
  description: 'Manage job postings, candidates, interviews, and offers.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecruitmentService } from '@/lib/services/recruitment-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { RecruitmentDashboard } from './RecruitmentDashboard';

export const dynamic = 'force-dynamic';

export default async function RecruitmentPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Recruitment & ATS</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage job postings, candidates, interviews, and offers.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Users}
            title="No workspace yet"
            description="Create a company first to start recruiting."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const [jobs, candidates, interviews, offers, pipeline, stats] = await Promise.all([
    RecruitmentService.listJobPostings(organizationId),
    RecruitmentService.listCandidates(organizationId),
    RecruitmentService.listInterviews(organizationId),
    RecruitmentService.listOffers(organizationId),
    RecruitmentService.getHiringPipeline(organizationId),
    RecruitmentService.getHiringStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Recruitment & ATS</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage job postings, candidates, interviews, and offers.</p>
      </div>

      <RecruitmentDashboard
        organizationId={organizationId}
        jobs={jobs}
        candidates={candidates}
        interviews={interviews}
        offers={offers}
        pipeline={pipeline as Record<string, Array<{ id: string; name: string; rating: number; jobPostingId: string | null; appliedAt: Date }>>}
        stats={stats}
      />
    </div>
  );
}
