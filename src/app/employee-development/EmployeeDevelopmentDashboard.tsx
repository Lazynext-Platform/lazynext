'use client';

import {
  GraduationCap, ClipboardList, Award, Grid3x3, Compass, AlertTriangle, Calendar, TrendingUp,
} from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';

interface OnboardingTask {
  id: string; title: string; description: string; category: string; status: string;
  employeeId: string; dueDate: Date | null; completedAt: Date | null; order: number;
}
interface OnboardingStats {
  total: number; byCategory: Record<string, number>; byStatus: Record<string, number>; completionRate: number;
}
interface TrainingPlan {
  id: string; title: string; description: string; status: string; startDate: Date;
  endDate: Date | null; progress: number; employeeId: string; trainer: string | null;
}
interface TrainingStats {
  totalTrainingPlans: number; trainingByStatus: Record<string, number>;
  totalCertifications: number; activeCerts: number; expiringCerts: number; avgTrainingProgress: number;
}
interface Certification {
  id: string; name: string; issuer: string; issueDate: Date; expiryDate: Date | null;
  status: string; employeeId: string; credentialId: string | null;
}
interface Skill {
  id: string; employeeId: string; skillName: string; proficiency: number; certified: boolean; yearsExperience: number;
}
interface SkillsMatrix {
  skills: Skill[];
  bySkill: Record<string, Array<{ employeeId: string; proficiency: number; certified: boolean; yearsExperience: number }>>;
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'default',
  in_progress: 'warning',
  completed: 'success',
  skipped: 'default',
  active: 'success',
  completed_tp: 'success',
  paused: 'warning',
  cancelled: 'danger',
  expired: 'danger',
  revoked: 'danger',
  in_progress_cert: 'info',
};

const proficiencyColors = [
  'bg-red-500/20 text-red-400',
  'bg-orange-500/20 text-orange-400',
  'bg-yellow-500/20 text-yellow-400',
  'bg-lime-500/20 text-lime-400',
  'bg-green-500/20 text-green-400',
];

export function EmployeeDevelopmentDashboard({
  organizationId,
  onboardingTasks,
  onboardingStats,
  trainingPlans,
  trainingStats,
  certifications,
  skillsMatrix,
}: {
  organizationId: string;
  onboardingTasks: OnboardingTask[];
  onboardingStats: OnboardingStats;
  trainingPlans: TrainingPlan[];
  trainingStats: TrainingStats;
  certifications: Certification[];
  skillsMatrix: SkillsMatrix;
}) {
  void organizationId;
  const now = new Date();
  const expiringCerts = certifications.filter((c) => {
    if (c.status !== 'active' || !c.expiryDate) return false;
    const days = (new Date(c.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  });

  // Group onboarding tasks by category
  const tasksByCategory: Record<string, OnboardingTask[]> = {};
  for (const t of onboardingTasks) {
    if (!tasksByCategory[t.category]) tasksByCategory[t.category] = [];
    tasksByCategory[t.category].push(t);
  }

  // Group training plans by status
  const activeTraining = trainingPlans.filter((p) => p.status === 'active');
  const completedTraining = trainingPlans.filter((p) => p.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <ClipboardList className="h-3 w-3" /> Onboarding
          </div>
          <div className="text-2xl font-semibold">{onboardingStats.total}</div>
          <div className="text-xs text-fg-muted mt-1">{onboardingStats.completionRate}% complete</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <GraduationCap className="h-3 w-3" /> Training Plans
          </div>
          <div className="text-2xl font-semibold">{trainingStats.totalTrainingPlans}</div>
          <div className="text-xs text-fg-muted mt-1">{trainingStats.avgTrainingProgress}% avg progress</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Award className="h-3 w-3" /> Certifications
          </div>
          <div className="text-2xl font-semibold">{trainingStats.totalCertifications}</div>
          <div className="text-xs text-fg-muted mt-1">{trainingStats.activeCerts} active</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <TrendingUp className="h-3 w-3" /> Skills Tracked
          </div>
          <div className="text-2xl font-semibold">{skillsMatrix.skills.length}</div>
        </Card>
      </div>

      {/* Onboarding Tracker */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-accent-primary" /> Onboarding Tracker
        </h2>
        {onboardingTasks.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={ClipboardList} title="No onboarding tasks" description="Create onboarding tasks to track new hire progress." />
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Progress bar */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Completion</span>
                <span className="text-sm font-semibold">{onboardingStats.completionRate}%</span>
              </div>
              <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                <div className="h-full bg-accent-primary rounded-full transition-all" style={{ width: `${onboardingStats.completionRate}%` }} />
              </div>
            </Card>
            {/* Tasks by category */}
            {Object.entries(tasksByCategory).map(([category, tasks]) => {
              const completed = tasks.filter((t) => t.status === 'completed').length;
              const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
              return (
                <Card key={category} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="accent" className="text-xs">{category}</Badge>
                      <span className="text-xs text-fg-muted">{completed}/{tasks.length} done</span>
                    </div>
                    <span className="text-xs font-semibold">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-accent-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="space-y-1.5">
                    {tasks.slice(0, 5).map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className={`truncate ${t.status === 'completed' ? 'line-through text-fg-muted' : ''}`}>{t.title}</span>
                        <Badge variant={statusVariant[t.status] || 'default'} className="text-xs shrink-0">{t.status}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Training Plans */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-accent-primary" /> Training Plans
        </h2>
        {trainingPlans.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={GraduationCap} title="No training plans" description="Create training plans to track employee development." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {trainingPlans.slice(0, 12).map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-semibold block truncate pr-2">{p.title}</span>
                  <Badge variant={statusVariant[p.status] || 'default'} className="text-xs shrink-0">{p.status}</Badge>
                </div>
                {p.description && <p className="text-xs text-fg-secondary mb-2 line-clamp-2">{p.description}</p>}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-fg-muted">Progress</span>
                    <span className="font-medium">{p.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
                    <div className="h-full bg-accent-primary rounded-full" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
                <div className="text-xs text-fg-muted flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {new Date(p.startDate).toLocaleDateString()}
                </div>
              </Card>
            ))}
          </div>
        )}
        {activeTraining.length > 0 && (
          <div className="text-xs text-fg-muted mt-2">{activeTraining.length} active training plan(s)</div>
        )}
        {completedTraining.length > 0 && (
          <div className="text-xs text-success mt-1">{completedTraining.length} completed training plan(s)</div>
        )}
      </div>

      {/* Certifications */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Award className="h-5 w-5 text-accent-primary" /> Certifications
        </h2>
        {certifications.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Award} title="No certifications" description="Track employee certifications and expiry dates." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {certifications.slice(0, 12).map((c) => {
              const isExpired = c.status === 'expired' || (c.expiryDate && new Date(c.expiryDate) < now);
              const daysLeft = c.expiryDate ? Math.floor((new Date(c.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
              return (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-semibold block truncate pr-2">{c.name}</span>
                    <Badge variant={isExpired ? 'danger' : daysLeft !== null && daysLeft <= 30 ? 'warning' : 'success'} className="text-xs shrink-0">
                      {isExpired ? 'expired' : daysLeft !== null ? `${daysLeft}d` : 'active'}
                    </Badge>
                  </div>
                  <div className="text-xs text-fg-secondary mb-1">{c.issuer}</div>
                  <div className="text-xs text-fg-muted">
                    Issued {new Date(c.issueDate).toLocaleDateString()}
                    {c.expiryDate && ` · Expires ${new Date(c.expiryDate).toLocaleDateString()}`}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        {expiringCerts.length > 0 && (
          <div className="text-xs text-warning mt-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {expiringCerts.length} certification(s) expiring within 30 days
          </div>
        )}
      </div>

      {/* Skills Matrix */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Grid3x3 className="h-5 w-5 text-accent-primary" /> Skills Matrix
        </h2>
        {skillsMatrix.skills.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Grid3x3} title="No skills tracked" description="Add skills to build a skills matrix across your team." />
          </Card>
        ) : (
          <Card className="p-4 overflow-x-auto">
            <div className="space-y-2">
              {Object.entries(skillsMatrix.bySkill).slice(0, 15).map(([skill, entries]) => (
                <div key={skill} className="flex items-center gap-3">
                  <div className="w-32 text-xs font-medium truncate shrink-0">{skill}</div>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {entries.map((e, i) => (
                      <span
                        key={`${e.employeeId}-${i}`}
                        className={`text-xs px-2 py-1 rounded-md font-mono ${proficiencyColors[Math.min(Math.max(e.proficiency - 1, 0), 4)]}`}
                        title={`${e.employeeId} · ${e.proficiency}/5${e.certified ? ' · certified' : ''}`}
                      >
                        {e.employeeId.slice(0, 6)}: {e.proficiency}/5
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Career Path placeholder */}
      <div>
        <h2 className="heading-display text-lg mb-3 flex items-center gap-2">
          <Compass className="h-5 w-5 text-accent-primary" /> Career Paths
        </h2>
        <Card className="p-6">
          <EmptyState
            icon={Compass}
            title="Career path tracking"
            description="Set career path goals for individual employees via the API."
          />
        </Card>
      </div>
    </div>
  );
}
