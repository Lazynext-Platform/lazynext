import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Safety Training & Certification — Lazynext',
  description: 'Manage training courses, enrollments, certifications, and compliance tracking.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SafetyTrainingService } from '@/lib/services/safety-training-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { SafetyTrainingDashboard } from './SafetyTrainingDashboard';

export const dynamic = 'force-dynamic';

export default async function SafetyTrainingPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Safety Training & Certification</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage training courses, enrollments, certifications, and compliance tracking.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={GraduationCap}
            title="No workspace yet"
            description="Create a company first to access safety training."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [courses, enrollments, certifications, compliances, metrics, stats] = await Promise.all([
    SafetyTrainingService.listTrainingCourses(organizationId),
    SafetyTrainingService.listTrainingEnrollments(organizationId),
    SafetyTrainingService.listCertificationRecords(organizationId),
    SafetyTrainingService.listTrainingCompliances(organizationId),
    SafetyTrainingService.getSafetyTrainingMetrics(organizationId),
    SafetyTrainingService.getSafetyTrainingStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Safety Training & Certification</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage training courses, enrollments, certifications, and compliance tracking.</p>
      </div>

      <SafetyTrainingDashboard
        organizationId={organizationId}
        courses={courses}
        enrollments={enrollments}
        certifications={certifications}
        compliances={compliances}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
