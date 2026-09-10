'use client';

import { useState, useMemo } from 'react';
import {
  GraduationCap, BookOpen, UserPlus, Award, CheckCircle, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  TrainingCourse, TrainingEnrollment, CertificationRecord, TrainingCompliance,
  SafetyTrainingMetrics, SafetyTrainingStats,
} from '@/lib/services/safety-training-service';

type TabId = 'overview' | 'courses' | 'enrollments' | 'certifications' | 'compliance';

interface SafetyTrainingDashboardProps {
  organizationId: string;
  courses: TrainingCourse[];
  enrollments: TrainingEnrollment[];
  certifications: CertificationRecord[];
  compliances: TrainingCompliance[];
  metrics: SafetyTrainingMetrics;
  stats: SafetyTrainingStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred', 'administered', 'boosted', 'resolved', 'mitigated', 'monitored', 'closed', 'reviewed', 'eliminated', 'implemented', 'approved', 'compliant', 'renewed'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'in_progress', 'in_review', 'investigating', 'reported', 'identified', 'assessed', 'controlled', 'enrolled'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'overdue', 'refused', 'revoked', 'no_show', 'non_compliant', 'ineffective', 'deprecated', 'reopened'].includes(status)) return 'danger';
  return 'info';
};

export function SafetyTrainingDashboard({
  courses, enrollments, certifications, compliances, metrics, stats,
}: SafetyTrainingDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredCourses = useMemo(() => {
    if (!search) return courses;
    const q = search.toLowerCase();
    return courses.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [courses, search]);

  const filteredEnrollments = useMemo(() => {
    if (!search) return enrollments;
    const q = search.toLowerCase();
    return enrollments.filter(
      (e) => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.status.toLowerCase().includes(q),
    );
  }, [enrollments, search]);

  const filteredCertifications = useMemo(() => {
    if (!search) return certifications;
    const q = search.toLowerCase();
    return certifications.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [certifications, search]);

  const filteredCompliances = useMemo(() => {
    if (!search) return compliances;
    const q = search.toLowerCase();
    return compliances.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [compliances, search]);

  const tabs: { id: TabId; label: string; icon: typeof GraduationCap }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'enrollments', label: 'Enrollments', icon: UserPlus },
    { id: 'certifications', label: 'Certifications', icon: Award },
    { id: 'compliance', label: 'Compliance', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'overview' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-primary px-10 py-2 text-sm focus:border-accent-primary focus:outline-none"
          />
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Courses</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeCourses}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Enrollments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedEnrollments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Certifications</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeCertifications}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Compliant Employees</div>
              <div className="mt-1 text-2xl font-bold">{metrics.compliantEmployees}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Overdue Compliance</div>
              <div className="mt-1 text-2xl font-bold">{metrics.overdueCompliance}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Course Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCourseType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Course Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCourseStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Enrollment Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byEnrollmentStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Certification Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCertificationStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'courses' && (
        <div className="space-y-3">
          {filteredCourses.length === 0 ? (
            <Card className="p-8"><EmptyState icon={BookOpen} title="No training courses" description="Training course records will appear here." /></Card>
          ) : (
            filteredCourses.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.provider || 'No provider'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.duration && <Badge variant="default">{c.duration}</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'enrollments' && (
        <div className="space-y-3">
          {filteredEnrollments.length === 0 ? (
            <Card className="p-8"><EmptyState icon={UserPlus} title="No enrollments" description="Training enrollment records will appear here." /></Card>
          ) : (
            filteredEnrollments.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-sm text-fg-secondary">{e.type.replace('_', ' ')} · {e.employeeName || 'No employee'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.score > 0 && <Badge variant="default">Score {e.score}</Badge>}
                    <Badge variant={statusVariant(e.status)}>{e.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'certifications' && (
        <div className="space-y-3">
          {filteredCertifications.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Award} title="No certification records" description="Certification records will appear here." /></Card>
          ) : (
            filteredCertifications.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.employeeName || 'No employee'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.certificationNumber && <Badge variant="default">{c.certificationNumber}</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'compliance' && (
        <div className="space-y-3">
          {filteredCompliances.length === 0 ? (
            <Card className="p-8"><EmptyState icon={CheckCircle} title="No compliance records" description="Training compliance records will appear here." /></Card>
          ) : (
            filteredCompliances.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.employeeName || 'No employee'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.complianceScore > 0 && <Badge variant="default">Score {c.complianceScore}</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
