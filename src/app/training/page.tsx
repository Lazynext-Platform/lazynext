import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Training — Lazynext',
  description: 'Manage courses, enrollments, certifications, learning paths, and assessments.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TrainingService } from '@/lib/services/training-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { TrainingDashboard } from './TrainingDashboard';

export const dynamic = 'force-dynamic';

export default async function TrainingPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Training</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage courses, enrollments, certifications, learning paths, and assessments.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={GraduationCap}
            title="No workspace yet"
            description="Create a company first to access training management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [courses, enrollments, certifications, learningPaths, assessments, metrics, stats] = await Promise.all([
    TrainingService.listCourses(organizationId),
    TrainingService.listEnrollments(organizationId),
    TrainingService.listCertifications(organizationId),
    TrainingService.listLearningPaths(organizationId),
    TrainingService.listAssessments(organizationId),
    TrainingService.getTrainingMetrics(organizationId),
    TrainingService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Training</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage courses, enrollments, certifications, learning paths, and assessments.</p>
      </div>

      <TrainingDashboard
        organizationId={organizationId}
        courses={courses}
        enrollments={enrollments}
        certifications={certifications}
        learningPaths={learningPaths}
        assessments={assessments}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
