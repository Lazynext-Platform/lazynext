import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Helpers ──

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function parseJsonArray(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

// ── Job Postings ──

export const RecruitmentService = {
  // ── Job Postings ──

  async createJobPosting(organizationId: string, input: {
    workspaceId?: string;
    title: string;
    department?: string;
    description?: string;
    requirements?: string[];
    responsibilities?: string[];
    location?: string;
    type?: string;
    status?: string;
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
    hiringManagerId?: string;
  }) {
    return prisma.jobPosting.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        title: input.title.slice(0, 300),
        department: input.department?.slice(0, 200) || '',
        description: input.description?.slice(0, 10000) || '',
        requirements: JSON.stringify(input.requirements || []),
        responsibilities: JSON.stringify(input.responsibilities || []),
        location: input.location?.slice(0, 200) || '',
        type: input.type || 'full_time',
        status: input.status || 'draft',
        salaryMin: input.salaryMin ?? null,
        salaryMax: input.salaryMax ?? null,
        currency: input.currency || 'USD',
        hiringManagerId: input.hiringManagerId || null,
      },
    });
  },

  async getJobPosting(id: string) {
    const job = await safePrisma(() =>
      prisma.jobPosting.findUnique({ where: { id } }),
    null);
    if (!job) return null;
    return {
      ...job,
      requirements: parseJsonArray(job.requirements),
      responsibilities: parseJsonArray(job.responsibilities),
    };
  },

  async listJobPostings(organizationId: string, opts?: {
    status?: string;
    department?: string;
    type?: string;
    search?: string;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.status) where.status = opts.status;
    if (opts?.department) where.department = opts.department;
    if (opts?.type) where.type = opts.type;
    if (opts?.search) {
      where.OR = [
        { title: { contains: opts.search } },
        { description: { contains: opts.search } },
        { department: { contains: opts.search } },
      ];
    }
    return safePrisma(() =>
      prisma.jobPosting.findMany({
        where,
        orderBy: [{ postedAt: 'desc' }, { updatedAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async updateJobPosting(id: string, input: {
    title?: string;
    department?: string;
    description?: string;
    requirements?: string[];
    responsibilities?: string[];
    location?: string;
    type?: string;
    status?: string;
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
    hiringManagerId?: string;
  }) {
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title.slice(0, 300);
    if (input.department !== undefined) data.department = input.department.slice(0, 200);
    if (input.description !== undefined) data.description = input.description.slice(0, 10000);
    if (input.requirements !== undefined) data.requirements = JSON.stringify(input.requirements);
    if (input.responsibilities !== undefined) data.responsibilities = JSON.stringify(input.responsibilities);
    if (input.location !== undefined) data.location = input.location.slice(0, 200);
    if (input.type !== undefined) data.type = input.type;
    if (input.status !== undefined) data.status = input.status;
    if (input.salaryMin !== undefined) data.salaryMin = input.salaryMin;
    if (input.salaryMax !== undefined) data.salaryMax = input.salaryMax;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.hiringManagerId !== undefined) data.hiringManagerId = input.hiringManagerId || null;
    return prisma.jobPosting.update({ where: { id }, data });
  },

  async deleteJobPosting(id: string) {
    return prisma.jobPosting.delete({ where: { id } });
  },

  async publishJobPosting(id: string) {
    return prisma.jobPosting.update({
      where: { id },
      data: { status: 'published', postedAt: new Date() },
    });
  },

  async closeJobPosting(id: string) {
    return prisma.jobPosting.update({
      where: { id },
      data: { status: 'closed', closedAt: new Date() },
    });
  },

  // ── Candidates ──

  async createCandidate(organizationId: string, input: {
    workspaceId?: string;
    jobPostingId?: string;
    name: string;
    email: string;
    phone?: string;
    resumeUrl?: string;
    resumeText?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    source?: string;
    status?: string;
    rating?: number;
    tags?: string[];
    notes?: string;
  }) {
    return prisma.candidate.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        jobPostingId: input.jobPostingId || null,
        name: input.name.slice(0, 300),
        email: input.email.slice(0, 300),
        phone: input.phone?.slice(0, 50) || null,
        resumeUrl: input.resumeUrl || null,
        resumeText: input.resumeText?.slice(0, 50000) || '',
        linkedinUrl: input.linkedinUrl || null,
        portfolioUrl: input.portfolioUrl || null,
        source: input.source || 'direct',
        status: input.status || 'new',
        rating: clamp(input.rating ?? 0, 0, 5),
        tags: JSON.stringify(input.tags || []),
        notes: input.notes?.slice(0, 10000) || '',
      },
    });
  },

  async getCandidate(id: string) {
    const candidate = await safePrisma(() =>
      prisma.candidate.findUnique({ where: { id } }),
    null);
    if (!candidate) return null;
    return { ...candidate, tags: parseJsonArray(candidate.tags) };
  },

  async listCandidates(organizationId: string, opts?: {
    jobPostingId?: string;
    status?: string;
    source?: string;
    search?: string;
    rating?: number;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.jobPostingId) where.jobPostingId = opts.jobPostingId;
    if (opts?.status) where.status = opts.status;
    if (opts?.source) where.source = opts.source;
    if (opts?.rating !== undefined) where.rating = opts.rating;
    if (opts?.search) {
      where.OR = [
        { name: { contains: opts.search } },
        { email: { contains: opts.search } },
        { notes: { contains: opts.search } },
      ];
    }
    return safePrisma(() =>
      prisma.candidate.findMany({
        where,
        orderBy: [{ appliedAt: 'desc' }, { updatedAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async updateCandidate(id: string, input: {
    name?: string;
    email?: string;
    phone?: string;
    resumeUrl?: string;
    resumeText?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    source?: string;
    status?: string;
    tags?: string[];
    notes?: string;
    jobPostingId?: string;
  }) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.slice(0, 300);
    if (input.email !== undefined) data.email = input.email.slice(0, 300);
    if (input.phone !== undefined) data.phone = input.phone?.slice(0, 50) || null;
    if (input.resumeUrl !== undefined) data.resumeUrl = input.resumeUrl || null;
    if (input.resumeText !== undefined) data.resumeText = input.resumeText.slice(0, 50000);
    if (input.linkedinUrl !== undefined) data.linkedinUrl = input.linkedinUrl || null;
    if (input.portfolioUrl !== undefined) data.portfolioUrl = input.portfolioUrl || null;
    if (input.source !== undefined) data.source = input.source;
    if (input.status !== undefined) data.status = input.status;
    if (input.tags !== undefined) data.tags = JSON.stringify(input.tags);
    if (input.notes !== undefined) data.notes = input.notes.slice(0, 10000);
    if (input.jobPostingId !== undefined) data.jobPostingId = input.jobPostingId || null;
    return prisma.candidate.update({ where: { id }, data });
  },

  async deleteCandidate(id: string) {
    return prisma.candidate.delete({ where: { id } });
  },

  async changeCandidateStatus(id: string, status: string) {
    return prisma.candidate.update({ where: { id }, data: { status } });
  },

  async rateCandidate(id: string, rating: number) {
    return prisma.candidate.update({ where: { id }, data: { rating: clamp(rating, 0, 5) } });
  },

  // ── Interviews ──

  async createInterview(organizationId: string, input: {
    candidateId: string;
    jobPostingId?: string;
    type?: string;
    status?: string;
    scheduledAt: Date;
    duration?: number;
    location?: string;
    interviewerIds?: string[];
  }) {
    return prisma.interview.create({
      data: {
        organizationId,
        candidateId: input.candidateId,
        jobPostingId: input.jobPostingId || null,
        type: input.type || 'phone',
        status: input.status || 'scheduled',
        scheduledAt: input.scheduledAt,
        duration: clamp(input.duration ?? 60, 1, 600),
        location: input.location?.slice(0, 300) || '',
        interviewerIds: JSON.stringify(input.interviewerIds || []),
      },
    });
  },

  async getInterview(id: string) {
    const interview = await safePrisma(() =>
      prisma.interview.findUnique({ where: { id } }),
    null);
    if (!interview) return null;
    return { ...interview, interviewerIds: parseJsonArray(interview.interviewerIds) };
  },

  async listInterviews(organizationId: string, opts?: {
    candidateId?: string;
    status?: string;
    type?: string;
    dateStart?: Date;
    dateEnd?: Date;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.candidateId) where.candidateId = opts.candidateId;
    if (opts?.status) where.status = opts.status;
    if (opts?.type) where.type = opts.type;
    if (opts?.dateStart || opts?.dateEnd) {
      const range: Record<string, unknown> = {};
      if (opts?.dateStart) range.gte = opts.dateStart;
      if (opts?.dateEnd) range.lte = opts.dateEnd;
      where.scheduledAt = range;
    }
    return safePrisma(() =>
      prisma.interview.findMany({
        where,
        orderBy: [{ scheduledAt: 'asc' }],
        take: 200,
      }),
    []);
  },

  async updateInterview(id: string, input: {
    type?: string;
    status?: string;
    scheduledAt?: Date;
    duration?: number;
    location?: string;
    interviewerIds?: string[];
  }) {
    const data: Record<string, unknown> = {};
    if (input.type !== undefined) data.type = input.type;
    if (input.status !== undefined) data.status = input.status;
    if (input.scheduledAt !== undefined) data.scheduledAt = input.scheduledAt;
    if (input.duration !== undefined) data.duration = clamp(input.duration, 1, 600);
    if (input.location !== undefined) data.location = input.location.slice(0, 300);
    if (input.interviewerIds !== undefined) data.interviewerIds = JSON.stringify(input.interviewerIds);
    return prisma.interview.update({ where: { id }, data });
  },

  async cancelInterview(id: string) {
    return prisma.interview.update({ where: { id }, data: { status: 'cancelled' } });
  },

  async addInterviewFeedback(id: string, feedback: string, rating: number) {
    return prisma.interview.update({
      where: { id },
      data: {
        feedback: feedback.slice(0, 10000),
        rating: clamp(rating, 0, 5),
        status: 'completed',
      },
    });
  },

  // ── Job Offers ──

  async createOffer(organizationId: string, input: {
    candidateId: string;
    jobPostingId?: string;
    salary: number;
    currency?: string;
    startDate?: Date;
    benefits?: Record<string, unknown>;
    terms?: string;
    expiresAt?: Date;
  }) {
    return prisma.jobOffer.create({
      data: {
        organizationId,
        candidateId: input.candidateId,
        jobPostingId: input.jobPostingId || null,
        status: 'draft',
        salary: input.salary,
        currency: input.currency || 'USD',
        startDate: input.startDate || null,
        benefits: JSON.stringify(input.benefits || {}),
        terms: input.terms?.slice(0, 10000) || '',
        expiresAt: input.expiresAt || null,
      },
    });
  },

  async getOffer(id: string) {
    const offer = await safePrisma(() =>
      prisma.jobOffer.findUnique({ where: { id } }),
    null);
    if (!offer) return null;
    return { ...offer, benefits: parseJsonObject(offer.benefits) };
  },

  async listOffers(organizationId: string, opts?: {
    candidateId?: string;
    status?: string;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.candidateId) where.candidateId = opts.candidateId;
    if (opts?.status) where.status = opts.status;
    return safePrisma(() =>
      prisma.jobOffer.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async updateOffer(id: string, input: {
    salary?: number;
    currency?: string;
    startDate?: Date;
    benefits?: Record<string, unknown>;
    terms?: string;
    expiresAt?: Date;
    status?: string;
  }) {
    const data: Record<string, unknown> = {};
    if (input.salary !== undefined) data.salary = input.salary;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.startDate !== undefined) data.startDate = input.startDate;
    if (input.benefits !== undefined) data.benefits = JSON.stringify(input.benefits);
    if (input.terms !== undefined) data.terms = input.terms.slice(0, 10000);
    if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;
    if (input.status !== undefined) data.status = input.status;
    return prisma.jobOffer.update({ where: { id }, data });
  },

  async deleteOffer(id: string) {
    return prisma.jobOffer.delete({ where: { id } });
  },

  async sendOffer(id: string) {
    return prisma.jobOffer.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() },
    });
  },

  async acceptOffer(id: string) {
    const offer = await prisma.jobOffer.update({
      where: { id },
      data: { status: 'accepted', respondedAt: new Date() },
    });
    // Update candidate status to hired
    await prisma.candidate.update({
      where: { id: offer.candidateId },
      data: { status: 'hired' },
    }).catch(() => null);
    return offer;
  },

  async rejectOffer(id: string) {
    return prisma.jobOffer.update({
      where: { id },
      data: { status: 'rejected', respondedAt: new Date() },
    });
  },

  async withdrawOffer(id: string) {
    return prisma.jobOffer.update({
      where: { id },
      data: { status: 'withdrawn' },
    });
  },

  // ── Pipeline & Stats ──

  async getHiringPipeline(organizationId: string, opts?: {
    jobPostingId?: string;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.jobPostingId) where.jobPostingId = opts.jobPostingId;
    const candidates = await safePrisma(() =>
      prisma.candidate.findMany({
        where,
        select: { id: true, name: true, status: true, rating: true, jobPostingId: true, appliedAt: true },
        orderBy: [{ appliedAt: 'desc' }],
        take: 500,
      }),
    []);
    const stages = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'];
    const pipeline: Record<string, Array<{ id: string; name: string; rating: number; jobPostingId: string | null; appliedAt: Date }>> = {};
    for (const stage of stages) pipeline[stage] = [];
    for (const c of candidates as Array<{ id: string; name: string; status: string; rating: number; jobPostingId: string | null; appliedAt: Date }>) {
      const stage = pipeline[c.status] ? c.status : 'new';
      pipeline[stage].push({ id: c.id, name: c.name, rating: c.rating, jobPostingId: c.jobPostingId, appliedAt: c.appliedAt });
    }
    return pipeline;
  },

  async getHiringStats(organizationId: string) {
    const [
      totalJobs, jobsByStatus, totalCandidates, candidatesByStatus,
      totalInterviews, totalOffers, offersByStatus,
    ] = await Promise.all([
      safePrisma(() => prisma.jobPosting.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.jobPosting.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      []),
      safePrisma(() => prisma.candidate.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.candidate.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      []),
      safePrisma(() => prisma.interview.count({ where: { organizationId } }), 0),
      safePrisma(() => prisma.jobOffer.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.jobOffer.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      []),
    ]);
    const jobStatusCounts: Record<string, number> = {};
    for (const row of jobsByStatus as Array<{ status: string; _count: number }>) {
      jobStatusCounts[row.status] = row._count;
    }
    const candidateStatusCounts: Record<string, number> = {};
    for (const row of candidatesByStatus as Array<{ status: string; _count: number }>) {
      candidateStatusCounts[row.status] = row._count;
    }
    const offerStatusCounts: Record<string, number> = {};
    for (const row of offersByStatus as Array<{ status: string; _count: number }>) {
      offerStatusCounts[row.status] = row._count;
    }
    const accepted = offerStatusCounts.accepted || 0;
    const responded = accepted + (offerStatusCounts.rejected || 0);
    const acceptanceRate = responded > 0 ? Math.round((accepted / responded) * 100) / 100 : 0;

    // Avg time to hire: from candidate.appliedAt to offer.respondedAt for accepted offers
    let avgTimeToHire = 0;
    try {
      const acceptedOffers = await prisma.jobOffer.findMany({
        where: { organizationId, status: 'accepted', respondedAt: { not: null } },
        select: { candidateId: true, respondedAt: true },
      });
      if (acceptedOffers.length > 0) {
        const candidateIds = acceptedOffers.map((o) => o.candidateId);
        const hiredCandidates = await prisma.candidate.findMany({
          where: { id: { in: candidateIds } },
          select: { id: true, appliedAt: true },
        });
        const appliedMap = new Map(hiredCandidates.map((c) => [c.id, c.appliedAt]));
        let totalDays = 0;
        let count = 0;
        for (const o of acceptedOffers) {
          const applied = appliedMap.get(o.candidateId);
          if (applied && o.respondedAt) {
            const days = (new Date(o.respondedAt).getTime() - new Date(applied).getTime()) / (1000 * 60 * 60 * 24);
            if (days >= 0) {
              totalDays += days;
              count += 1;
            }
          }
        }
        avgTimeToHire = count > 0 ? Math.round((totalDays / count) * 10) / 10 : 0;
      }
    } catch {
      avgTimeToHire = 0;
    }

    return {
      totalJobs,
      jobsByStatus: jobStatusCounts,
      totalCandidates,
      candidatesByStatus: candidateStatusCounts,
      totalInterviews,
      totalOffers,
      offersByStatus: offerStatusCounts,
      acceptanceRate,
      avgTimeToHire,
    };
  },
};
