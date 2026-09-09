'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  GraduationCap, BookOpen, UserCheck, Award, Route, FileQuestion,
  Search, BarChart3, CheckCircle, XCircle,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  Course, Enrollment, Certification, LearningPath, Assessment,
  TrainingMetrics, TrainingStats,
  CourseStatus, EnrollmentStatus, CertificationStatus, LearningPathStatus, AssessmentStatus,
} from '@/lib/services/training-service';

// ── Types ──

interface TrainingDashboardProps {
  organizationId: string;
  courses: Course[];
  enrollments: Enrollment[];
  certifications: Certification[];
  learningPaths: LearningPath[];
  assessments: Assessment[];
  metrics: TrainingMetrics;
  stats: TrainingStats;
}

// ── Helpers ──

const courseStatusVariant: Record<CourseStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  published: 'success',
  draft: 'info',
  archived: 'default',
};

const enrollmentStatusVariant: Record<EnrollmentStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  enrolled: 'info',
  in_progress: 'warning',
  completed: 'success',
  dropped: 'default',
  expired: 'danger',
};

const certificationStatusVariant: Record<CertificationStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  issued: 'info',
  verified: 'success',
  expired: 'warning',
  revoked: 'danger',
};

const learningPathStatusVariant: Record<LearningPathStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  archived: 'default',
};

const assessmentStatusVariant: Record<AssessmentStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  archived: 'default',
};

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Component ──

type TabId = 'overview' | 'courses' | 'enrollments' | 'certifications' | 'learning_paths' | 'assessments';

export function TrainingDashboard({
  organizationId: _organizationId,
  courses,
  enrollments,
  certifications,
  learningPaths,
  assessments,
  metrics,
  stats,
}: TrainingDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const courseTitle = useCallback((id: string | null) => (id ? courses.find((c) => c.id === id)?.title || id : '—'), [courses]);

  const filteredCourses = useMemo(() => {
    if (!search) return courses;
    const q = search.toLowerCase();
    return courses.filter(
      (c) => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.format.toLowerCase().includes(q) || c.difficulty.toLowerCase().includes(q),
    );
  }, [courses, search]);

  const filteredEnrollments = useMemo(() => {
    if (!search) return enrollments;
    const q = search.toLowerCase();
    return enrollments.filter(
      (e) => e.employeeName.toLowerCase().includes(q) || e.status.toLowerCase().includes(q),
    );
  }, [enrollments, search]);

  const filteredCertifications = useMemo(() => {
    if (!search) return certifications;
    const q = search.toLowerCase();
    return certifications.filter(
      (c) => c.name.toLowerCase().includes(q) || c.employeeName.toLowerCase().includes(q) || c.status.toLowerCase().includes(q) || c.issuer.toLowerCase().includes(q),
    );
  }, [certifications, search]);

  const filteredLearningPaths = useMemo(() => {
    if (!search) return learningPaths;
    const q = search.toLowerCase();
    return learningPaths.filter(
      (lp) => lp.name.toLowerCase().includes(q) || (lp.category ?? '').toLowerCase().includes(q) || lp.targetRole.toLowerCase().includes(q),
    );
  }, [learningPaths, search]);

  const filteredAssessments = useMemo(() => {
    if (!search) return assessments;
    const q = search.toLowerCase();
    return assessments.filter(
      (a) => a.title.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [assessments, search]);

  const tabs: { id: TabId; label: string; icon: typeof BookOpen }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'enrollments', label: 'Enrollments', icon: UserCheck },
    { id: 'certifications', label: 'Certifications', icon: Award },
    { id: 'learning_paths', label: 'Learning Paths', icon: Route },
    { id: 'assessments', label: 'Assessments', icon: FileQuestion },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Courses</span>
          </div>
          <p className="text-2xl font-semibold">{stats.courseCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Enrollments</span>
          </div>
          <p className="text-2xl font-semibold">{stats.enrollmentCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.activeEnrollmentCount} active</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Certs</span>
          </div>
          <p className="text-2xl font-semibold">{stats.certificationCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.verifiedCertificationCount} verified</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Route className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Paths</span>
          </div>
          <p className="text-2xl font-semibold">{stats.learningPathCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileQuestion className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Assessments</span>
          </div>
          <p className="text-2xl font-semibold">{stats.assessmentCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Completion</span>
          </div>
          <p className="text-2xl font-semibold">{stats.completionRate}%</p>
          <p className="text-xs text-fg-secondary mt-0.5">Avg score: {stats.avgScore}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-alt text-fg-secondary hover:text-fg-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      {tab !== 'overview' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>
      )}

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Training Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Completion rate</span>
                  <span className="font-medium">{metrics.completionRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Active enrollments</span>
                  <span className="font-medium">{metrics.activeEnrollments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Certification compliance</span>
                  <span className="font-medium">{metrics.certificationCompliance}%</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Average score</span>
                  <span>{metrics.avgScore}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Popular Courses</h2>
              </div>
              {metrics.popularCourses.length === 0 ? (
                <p className="text-sm text-fg-secondary">No enrollment data yet.</p>
              ) : (
                <div className="space-y-2">
                  {metrics.popularCourses.map((c) => (
                    <div key={c.courseId} className="flex justify-between text-sm">
                      <span className="text-fg-secondary">{c.title}</span>
                      <span className="font-medium">{c.enrollmentCount} enrolled</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'courses' && (
        <div className="space-y-4">
          {filteredCourses.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={BookOpen} title="No courses" description="Create a course to get started." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Format</th>
                    <th className="p-3 font-medium">Difficulty</th>
                    <th className="p-3 font-medium">Duration</th>
                    <th className="p-3 font-medium">Instructor</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => (
                    <tr key={course.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{course.title}</td>
                      <td className="p-3">{course.category}</td>
                      <td className="p-3">{course.format}</td>
                      <td className="p-3">{course.difficulty}</td>
                      <td className="p-3">{course.durationHours !== null ? `${course.durationHours}h` : '—'}</td>
                      <td className="p-3">{course.instructor || '—'}</td>
                      <td className="p-3"><Badge variant={courseStatusVariant[course.status]}>{course.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'enrollments' && (
        <div className="space-y-4">
          {filteredEnrollments.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={UserCheck} title="No enrollments" description="Create an enrollment to see it here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Employee</th>
                    <th className="p-3 font-medium">Course</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Progress</th>
                    <th className="p-3 font-medium">Score</th>
                    <th className="p-3 font-medium">Enrolled</th>
                    <th className="p-3 font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{enrollment.employeeName}</td>
                      <td className="p-3">{courseTitle(enrollment.courseId)}</td>
                      <td className="p-3"><Badge variant={enrollmentStatusVariant[enrollment.status]}>{enrollment.status}</Badge></td>
                      <td className="p-3">{enrollment.progress}%</td>
                      <td className="p-3">{enrollment.score !== null ? enrollment.score : '—'}</td>
                      <td className="p-3">{formatDate(enrollment.enrolledDate)}</td>
                      <td className="p-3">{formatDate(enrollment.completedDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'certifications' && (
        <div className="space-y-4">
          {filteredCertifications.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Award} title="No certifications" description="Create a certification to see it here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Employee</th>
                    <th className="p-3 font-medium">Issuer</th>
                    <th className="p-3 font-medium">Valid From</th>
                    <th className="p-3 font-medium">Valid To</th>
                    <th className="p-3 font-medium">Verified</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCertifications.map((cert) => (
                    <tr key={cert.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{cert.name}</td>
                      <td className="p-3">{cert.employeeName || '—'}</td>
                      <td className="p-3">{cert.issuer || '—'}</td>
                      <td className="p-3">{formatDate(cert.validFrom)}</td>
                      <td className="p-3">{formatDate(cert.validTo)}</td>
                      <td className="p-3">
                        {cert.verifiedBy ? (
                          <span className="inline-flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-success" />Yes</span>
                        ) : (
                          <span className="inline-flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-fg-muted" />No</span>
                        )}
                      </td>
                      <td className="p-3"><Badge variant={certificationStatusVariant[cert.status]}>{cert.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'learning_paths' && (
        <div className="space-y-4">
          {filteredLearningPaths.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Route} title="No learning paths" description="Create a learning path to see it here." />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLearningPaths.map((lp) => (
                <Card key={lp.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{lp.name}</h3>
                      <p className="text-xs text-fg-secondary">{lp.category ?? '—'}</p>
                    </div>
                    <Badge variant={learningPathStatusVariant[lp.status]}>{lp.status}</Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Target role</span>
                      <span className="font-medium">{lp.targetRole || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Courses</span>
                      <span className="font-medium">{lp.courses.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Est. hours</span>
                      <span className="font-medium">{lp.estimatedHours !== null ? `${lp.estimatedHours}h` : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Difficulty</span>
                      <span className="font-medium">{lp.difficulty ?? '—'}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'assessments' && (
        <div className="space-y-4">
          {filteredAssessments.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={FileQuestion} title="No assessments" description="Create an assessment to see it here." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Course</th>
                    <th className="p-3 font-medium">Questions</th>
                    <th className="p-3 font-medium">Passing Score</th>
                    <th className="p-3 font-medium">Duration</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssessments.map((assessment) => (
                    <tr key={assessment.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{assessment.title}</td>
                      <td className="p-3">{assessment.type}</td>
                      <td className="p-3">{courseTitle(assessment.courseId)}</td>
                      <td className="p-3">{Array.isArray(assessment.questions) ? assessment.questions.length : 0}</td>
                      <td className="p-3">{assessment.passingScore !== null ? `${assessment.passingScore}%` : '—'}</td>
                      <td className="p-3">{assessment.durationMinutes !== null ? `${assessment.durationMinutes}m` : '—'}</td>
                      <td className="p-3"><Badge variant={assessmentStatusVariant[assessment.status]}>{assessment.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
