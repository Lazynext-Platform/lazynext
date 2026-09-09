import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Training Plans ──

export interface TrainingPlanInput {
  employeeId: string;
  title: string;
  description?: string;
  status?: string;
  startDate: Date;
  endDate?: Date;
  progress?: number;
  trainer?: string;
}

export interface TrainingPlanUpdate {
  title?: string;
  description?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  progress?: number;
  trainer?: string;
}

export interface TrainingPlanListOpts {
  employeeId?: string;
  status?: string;
}

// ── Certifications ──

export interface CertificationInput {
  employeeId: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
  status?: string;
}

export interface CertificationUpdate {
  name?: string;
  issuer?: string;
  issueDate?: Date;
  expiryDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
  status?: string;
}

export interface CertificationListOpts {
  employeeId?: string;
  status?: string;
}

// ── Skills ──

export interface SkillInput {
  employeeId: string;
  skillName: string;
  proficiency: number; // 1-5
  certified?: boolean;
  yearsExperience?: number;
}

export interface Skill {
  id: string;
  employeeId: string;
  skillName: string;
  proficiency: number;
  certified: boolean;
  yearsExperience: number;
}

// ── Career Path ──

export interface CareerPathInput {
  currentRole: string;
  targetRole: string;
  timeline: string;
  milestones: Array<{ title: string; description?: string; targetDate?: string }>;
  developmentGoals: string[];
  mentorId?: string;
}

export interface CareerPath {
  id: string;
  employeeId: string;
  currentRole: string;
  targetRole: string;
  timeline: string;
  milestones: Array<{ title: string; description: string; targetDate: string }>;
  developmentGoals: string[];
  mentorId: string | null;
}

function clampInt(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export const EmployeeDevelopmentService = {
  // ── Training Plans ──

  async createTrainingPlan(organizationId: string, input: TrainingPlanInput) {
    return prisma.trainingPlan.create({
      data: {
        organizationId,
        employeeId: input.employeeId,
        title: input.title.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        status: input.status || 'active',
        startDate: input.startDate,
        endDate: input.endDate || null,
        progress: clampInt(input.progress ?? 0, 0, 100),
        trainer: input.trainer || null,
      },
    });
  },

  async getTrainingPlan(id: string) {
    return safePrisma(() =>
      prisma.trainingPlan.findUnique({ where: { id } }),
    null);
  },

  async listTrainingPlans(organizationId: string, opts?: TrainingPlanListOpts) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.employeeId) where.employeeId = opts.employeeId;
    if (opts?.status) where.status = opts.status;
    return safePrisma(() =>
      prisma.trainingPlan.findMany({
        where,
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async updateTrainingPlan(id: string, input: TrainingPlanUpdate) {
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title.slice(0, 300);
    if (input.description !== undefined) data.description = input.description.slice(0, 5000);
    if (input.status !== undefined) data.status = input.status;
    if (input.startDate !== undefined) data.startDate = input.startDate;
    if (input.endDate !== undefined) data.endDate = input.endDate;
    if (input.progress !== undefined) data.progress = clampInt(input.progress, 0, 100);
    if (input.trainer !== undefined) data.trainer = input.trainer || null;
    return prisma.trainingPlan.update({ where: { id }, data });
  },

  async deleteTrainingPlan(id: string) {
    return prisma.trainingPlan.delete({ where: { id } });
  },

  async updateTrainingProgress(id: string, progress: number) {
    return prisma.trainingPlan.update({
      where: { id },
      data: { progress: clampInt(progress, 0, 100) },
    });
  },

  async completeTrainingPlan(id: string) {
    return prisma.trainingPlan.update({
      where: { id },
      data: { status: 'completed', progress: 100, endDate: new Date() },
    });
  },

  async getTrainingPlansByEmployee(employeeId: string) {
    return safePrisma(() =>
      prisma.trainingPlan.findMany({
        where: { employeeId },
        orderBy: [{ startDate: 'desc' }],
        take: 100,
      }),
    []);
  },

  // ── Certifications ──

  async createCertification(organizationId: string, input: CertificationInput) {
    return prisma.certification.create({
      data: {
        organizationId,
        employeeId: input.employeeId,
        name: input.name.slice(0, 300),
        issuer: input.issuer.slice(0, 300),
        issueDate: input.issueDate,
        expiryDate: input.expiryDate || null,
        credentialId: input.credentialId || null,
        credentialUrl: input.credentialUrl || null,
        status: input.status || 'active',
      },
    });
  },

  async getCertification(id: string) {
    return safePrisma(() =>
      prisma.certification.findUnique({ where: { id } }),
    null);
  },

  async listCertifications(organizationId: string, opts?: CertificationListOpts) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.employeeId) where.employeeId = opts.employeeId;
    if (opts?.status) where.status = opts.status;
    return safePrisma(() =>
      prisma.certification.findMany({
        where,
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async updateCertification(id: string, input: CertificationUpdate) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.slice(0, 300);
    if (input.issuer !== undefined) data.issuer = input.issuer.slice(0, 300);
    if (input.issueDate !== undefined) data.issueDate = input.issueDate;
    if (input.expiryDate !== undefined) data.expiryDate = input.expiryDate;
    if (input.credentialId !== undefined) data.credentialId = input.credentialId || null;
    if (input.credentialUrl !== undefined) data.credentialUrl = input.credentialUrl || null;
    if (input.status !== undefined) data.status = input.status;
    return prisma.certification.update({ where: { id }, data });
  },

  async deleteCertification(id: string) {
    return prisma.certification.delete({ where: { id } });
  },

  async getExpiringCertifications(organizationId: string, days = 30) {
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return safePrisma(() =>
      prisma.certification.findMany({
        where: {
          organizationId,
          status: 'active',
          expiryDate: { gte: now, lte: horizon },
        },
        orderBy: { expiryDate: 'asc' },
        take: 100,
      }),
    []);
  },

  async getCertificationsByEmployee(employeeId: string) {
    return safePrisma(() =>
      prisma.certification.findMany({
        where: { employeeId },
        orderBy: [{ issueDate: 'desc' }],
        take: 100,
      }),
    []);
  },

  // ── Skills Matrix (stored in Memory type='employee_skill') ──

  async getSkillsMatrix(organizationId: string) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: { organizationId, type: 'employee_skill' },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    []);
    const skills: Skill[] = (memories as Array<{ id: string; content: string; owner: string | null }>).map((m) => {
      let data: { skillName?: string; proficiency?: number; certified?: boolean; yearsExperience?: number } = {};
      try { data = JSON.parse(m.content); } catch { data = {}; }
      return {
        id: m.id,
        employeeId: m.owner || '',
        skillName: data.skillName || '',
        proficiency: data.proficiency || 1,
        certified: data.certified || false,
        yearsExperience: data.yearsExperience || 0,
      };
    });
    // Group by skill name
    const bySkill: Record<string, Array<{ employeeId: string; proficiency: number; certified: boolean; yearsExperience: number }>> = {};
    for (const s of skills) {
      if (!bySkill[s.skillName]) bySkill[s.skillName] = [];
      bySkill[s.skillName].push({
        employeeId: s.employeeId,
        proficiency: s.proficiency,
        certified: s.certified,
        yearsExperience: s.yearsExperience,
      });
    }
    return { skills, bySkill };
  },

  async addSkill(organizationId: string, workspaceId: string, input: SkillInput, createdBy: string) {
    const content = JSON.stringify({
      skillName: input.skillName.slice(0, 200),
      proficiency: clampInt(input.proficiency, 1, 5),
      certified: input.certified || false,
      yearsExperience: input.yearsExperience ?? 0,
    });
    return prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'employee_skill',
        content,
        source: 'user',
        sourceId: createdBy,
        owner: input.employeeId,
        tags: JSON.stringify([input.skillName.slice(0, 100)]),
        createdBy,
      },
    });
  },

  // ── Career Path (stored in Memory type='career_path') ──

  async getCareerPath(employeeId: string): Promise<CareerPath | null> {
    const memory = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { type: 'career_path', owner: employeeId },
        orderBy: { createdAt: 'desc' },
      }),
    null);
    if (!memory) return null;
    let data: { currentRole?: string; targetRole?: string; timeline?: string; milestones?: Array<{ title: string; description: string; targetDate: string }>; developmentGoals?: string[]; mentorId?: string } = {};
    try { data = JSON.parse((memory as { content: string }).content); } catch { data = {}; }
    return {
      id: (memory as { id: string }).id,
      employeeId,
      currentRole: data.currentRole || '',
      targetRole: data.targetRole || '',
      timeline: data.timeline || '',
      milestones: data.milestones || [],
      developmentGoals: data.developmentGoals || [],
      mentorId: data.mentorId || null,
    };
  },

  async setCareerPath(employeeId: string, organizationId: string, workspaceId: string, input: CareerPathInput, createdBy: string) {
    const content = JSON.stringify({
      currentRole: input.currentRole.slice(0, 200),
      targetRole: input.targetRole.slice(0, 200),
      timeline: input.timeline.slice(0, 100),
      milestones: (input.milestones || []).map((m) => ({
        title: m.title.slice(0, 300),
        description: m.description?.slice(0, 5000) || '',
        targetDate: m.targetDate || '',
      })),
      developmentGoals: (input.developmentGoals || []).map((g) => g.slice(0, 500)),
      mentorId: input.mentorId || null,
    });
    return prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'career_path',
        content,
        source: 'user',
        sourceId: createdBy,
        owner: employeeId,
        tags: JSON.stringify(['career_path']),
        createdBy,
      },
    });
  },

  // ── Overall Stats ──

  async getStats(organizationId: string) {
    const now = new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [totalTrainingPlans, trainingByStatus, totalCertifications, activeCerts, expiringCerts, progressAgg] = await Promise.all([
      safePrisma(() => prisma.trainingPlan.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.trainingPlan.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() => prisma.certification.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.certification.count({
          where: { organizationId, status: 'active' },
        }),
      0),
      safePrisma(() =>
        prisma.certification.count({
          where: {
            organizationId,
            status: 'active',
            expiryDate: { gte: now, lte: horizon },
          },
        }),
      0),
      safePrisma(() =>
        prisma.trainingPlan.aggregate({
          where: { organizationId },
          _avg: { progress: true },
        }),
      { _avg: { progress: null } }),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const row of trainingByStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    const avgProgress = (progressAgg as { _avg: { progress: number | null } })._avg.progress ?? 0;
    return {
      totalTrainingPlans,
      trainingByStatus: statusCounts,
      totalCertifications,
      activeCerts,
      expiringCerts,
      avgTrainingProgress: Math.round(avgProgress),
    };
  },
};
