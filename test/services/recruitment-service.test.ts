import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };
type GroupByArgs = { by: string[]; where: Record<string, unknown>; _count: boolean };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// JobPosting
let jobFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let jobFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let jobCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let jobUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let jobDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let jobCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let jobGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

// Candidate
let candFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let candFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let candCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let candUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let candDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let candCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let candGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

// Interview
let ivFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let ivFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let ivCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let ivUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let ivDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let ivCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

// JobOffer
let offFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let offFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let offCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let offUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let offDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let offCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let offGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  jobPosting: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'jobPosting.findMany', args }); return jobFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'jobPosting.findUnique', args }); return jobFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'jobPosting.create', args }); return jobCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'jobPosting.update', args }); return jobUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'jobPosting.delete', args }); return jobDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'jobPosting.count', args }); return jobCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'jobPosting.groupBy', args }); return jobGroupByImpl(args); },
  },
  candidate: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'candidate.findMany', args }); return candFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'candidate.findUnique', args }); return candFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'candidate.create', args }); return candCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'candidate.update', args }); return candUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'candidate.delete', args }); return candDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'candidate.count', args }); return candCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'candidate.groupBy', args }); return candGroupByImpl(args); },
  },
  interview: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'interview.findMany', args }); return ivFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'interview.findUnique', args }); return ivFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'interview.create', args }); return ivCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'interview.update', args }); return ivUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'interview.delete', args }); return ivDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'interview.count', args }); return ivCountImpl(args); },
  },
  jobOffer: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'jobOffer.findMany', args }); return offFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'jobOffer.findUnique', args }); return offFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'jobOffer.create', args }); return offCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'jobOffer.update', args }); return offUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'jobOffer.delete', args }); return offDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'jobOffer.count', args }); return offCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'jobOffer.groupBy', args }); return offGroupByImpl(args); },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function resetMock(): void {
  calls.length = 0;
  jobFindManyImpl = async () => []; jobFindUniqueImpl = async () => null; jobCreateImpl = async () => ({});
  jobUpdateImpl = async () => ({}); jobDeleteImpl = async () => ({}); jobCountImpl = async () => 0; jobGroupByImpl = async () => [];
  candFindManyImpl = async () => []; candFindUniqueImpl = async () => null; candCreateImpl = async () => ({});
  candUpdateImpl = async () => ({}); candDeleteImpl = async () => ({}); candCountImpl = async () => 0; candGroupByImpl = async () => [];
  ivFindManyImpl = async () => []; ivFindUniqueImpl = async () => null; ivCreateImpl = async () => ({});
  ivUpdateImpl = async () => ({}); ivDeleteImpl = async () => ({}); ivCountImpl = async () => 0;
  offFindManyImpl = async () => []; offFindUniqueImpl = async () => null; offCreateImpl = async () => ({});
  offUpdateImpl = async () => ({}); offDeleteImpl = async () => ({}); offCountImpl = async () => 0; offGroupByImpl = async () => [];
}

const { RecruitmentService } = await import('@/lib/services/recruitment-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('RecruitmentService', () => {
  beforeEach(() => { resetMock(); });

  // ── Job Postings ──

  describe('createJobPosting', () => {
    it('creates a job posting with defaults', async () => {
      jobCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.status, 'draft');
        assert.equal(args.data.type, 'full_time');
        assert.equal(args.data.requirements, JSON.stringify([]));
        return { id: 'j1', ...args.data };
      };
      const result = await RecruitmentService.createJobPosting('org-1', { title: 'Engineer' });
      assert.ok(result);
    });

    it('serializes requirements and responsibilities as JSON', async () => {
      jobCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.requirements, JSON.stringify(['React', 'Node']));
        assert.equal(args.data.responsibilities, JSON.stringify(['Build features']));
        return { id: 'j1', ...args.data };
      };
      await RecruitmentService.createJobPosting('org-1', {
        title: 'Engineer',
        requirements: ['React', 'Node'],
        responsibilities: ['Build features'],
      });
    });
  });

  describe('getJobPosting', () => {
    it('returns a job posting with parsed JSON fields', async () => {
      jobFindUniqueImpl = async () => ({
        id: 'j1', title: 'Engineer',
        requirements: JSON.stringify(['React']),
        responsibilities: JSON.stringify(['Build']),
      });
      const result = await RecruitmentService.getJobPosting('j1') as { requirements: string[]; responsibilities: string[] };
      assert.ok(result);
      assert.deepEqual(result.requirements, ['React']);
      assert.deepEqual(result.responsibilities, ['Build']);
    });

    it('returns null when not found', async () => {
      jobFindUniqueImpl = async () => null;
      const result = await RecruitmentService.getJobPosting('nope');
      assert.equal(result, null);
    });
  });

  describe('listJobPostings', () => {
    it('returns job postings for an organization', async () => {
      jobFindManyImpl = async () => [{ id: 'j1', title: 'Engineer' }];
      const result = await RecruitmentService.listJobPostings('org-1');
      assert.equal(result.length, 1);
    });

    it('applies status, department, type, and search filters', async () => {
      jobFindManyImpl = async () => [];
      await RecruitmentService.listJobPostings('org-1', { status: 'published', department: 'Eng', type: 'full_time', search: 'eng' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'published');
      assert.equal(args.where.department, 'Eng');
      assert.equal(args.where.type, 'full_time');
      assert.ok(args.where.OR);
    });
  });

  describe('publishJobPosting', () => {
    it('sets status to published and sets postedAt', async () => {
      jobUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'published');
        assert.ok(args.data.postedAt);
        return { id: 'j1', ...args.data };
      };
      const result = await RecruitmentService.publishJobPosting('j1');
      assert.ok(result);
    });
  });

  describe('closeJobPosting', () => {
    it('sets status to closed and sets closedAt', async () => {
      jobUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'closed');
        assert.ok(args.data.closedAt);
        return { id: 'j1', ...args.data };
      };
      const result = await RecruitmentService.closeJobPosting('j1');
      assert.ok(result);
    });
  });

  // ── Candidates ──

  describe('createCandidate', () => {
    it('creates a candidate with defaults', async () => {
      candCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.status, 'new');
        assert.equal(args.data.source, 'direct');
        assert.equal(args.data.rating, 0);
        return { id: 'c1', ...args.data };
      };
      const result = await RecruitmentService.createCandidate('org-1', { name: 'Jane', email: 'jane@test.com' });
      assert.ok(result);
    });

    it('clamps rating to 0-5 range', async () => {
      candCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.rating, 5);
        return { id: 'c1', ...args.data };
      };
      await RecruitmentService.createCandidate('org-1', { name: 'Jane', email: 'jane@test.com', rating: 99 });
    });
  });

  describe('listCandidates', () => {
    it('returns candidates for an organization', async () => {
      candFindManyImpl = async () => [{ id: 'c1', name: 'Jane' }];
      const result = await RecruitmentService.listCandidates('org-1');
      assert.equal(result.length, 1);
    });

    it('applies jobPostingId, status, source, and rating filters', async () => {
      candFindManyImpl = async () => [];
      await RecruitmentService.listCandidates('org-1', { jobPostingId: 'j1', status: 'interview', source: 'referral', rating: 4 });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.jobPostingId, 'j1');
      assert.equal(args.where.status, 'interview');
      assert.equal(args.where.source, 'referral');
      assert.equal(args.where.rating, 4);
    });
  });

  describe('changeCandidateStatus', () => {
    it('updates candidate status', async () => {
      candUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'interview');
        return { id: 'c1', ...args.data };
      };
      const result = await RecruitmentService.changeCandidateStatus('c1', 'interview');
      assert.ok(result);
    });
  });

  describe('rateCandidate', () => {
    it('updates candidate rating clamped to 0-5', async () => {
      candUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.rating, 5);
        return { id: 'c1', ...args.data };
      };
      const result = await RecruitmentService.rateCandidate('c1', 10);
      assert.ok(result);
    });
  });

  // ── Interviews ──

  describe('createInterview', () => {
    it('creates an interview with defaults', async () => {
      ivCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'phone');
        assert.equal(args.data.status, 'scheduled');
        assert.equal(args.data.interviewerIds, JSON.stringify([]));
        return { id: 'iv1', ...args.data };
      };
      const result = await RecruitmentService.createInterview('org-1', {
        candidateId: 'c1', scheduledAt: new Date('2024-02-01'),
      });
      assert.ok(result);
    });

    it('clamps duration to 1-600', async () => {
      ivCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.duration, 600);
        return { id: 'iv1', ...args.data };
      };
      await RecruitmentService.createInterview('org-1', {
        candidateId: 'c1', scheduledAt: new Date('2024-02-01'), duration: 9999,
      });
    });
  });

  describe('addInterviewFeedback', () => {
    it('sets feedback, rating, and status to completed', async () => {
      ivUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.feedback, 'Great candidate');
        assert.equal(args.data.rating, 4);
        assert.equal(args.data.status, 'completed');
        return { id: 'iv1', ...args.data };
      };
      const result = await RecruitmentService.addInterviewFeedback('iv1', 'Great candidate', 4);
      assert.ok(result);
    });
  });

  // ── Job Offers ──

  describe('createOffer', () => {
    it('creates an offer with defaults', async () => {
      offCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.status, 'draft');
        assert.equal(args.data.currency, 'USD');
        assert.equal(args.data.benefits, JSON.stringify({}));
        return { id: 'o1', ...args.data };
      };
      const result = await RecruitmentService.createOffer('org-1', { candidateId: 'c1', salary: 80000 });
      assert.ok(result);
    });
  });

  describe('sendOffer', () => {
    it('sets status to sent and sets sentAt', async () => {
      offUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'sent');
        assert.ok(args.data.sentAt);
        return { id: 'o1', ...args.data };
      };
      const result = await RecruitmentService.sendOffer('o1');
      assert.ok(result);
    });
  });

  describe('acceptOffer', () => {
    it('sets status to accepted, sets respondedAt, and updates candidate to hired', async () => {
      offUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'accepted');
        assert.ok(args.data.respondedAt);
        return { id: 'o1', candidateId: 'c1', ...args.data };
      };
      candUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'hired');
        return { id: 'c1', ...args.data };
      };
      const result = await RecruitmentService.acceptOffer('o1');
      assert.ok(result);
    });
  });

  describe('rejectOffer', () => {
    it('sets status to rejected and sets respondedAt', async () => {
      offUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'rejected');
        assert.ok(args.data.respondedAt);
        return { id: 'o1', ...args.data };
      };
      const result = await RecruitmentService.rejectOffer('o1');
      assert.ok(result);
    });
  });

  describe('withdrawOffer', () => {
    it('sets status to withdrawn', async () => {
      offUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'withdrawn');
        return { id: 'o1', ...args.data };
      };
      const result = await RecruitmentService.withdrawOffer('o1');
      assert.ok(result);
    });
  });

  // ── Pipeline & Stats ──

  describe('getHiringPipeline', () => {
    it('returns candidates grouped by stage', async () => {
      candFindManyImpl = async () => [
        { id: 'c1', name: 'Jane', status: 'new', rating: 3, jobPostingId: 'j1', appliedAt: new Date('2024-01-01') },
        { id: 'c2', name: 'Bob', status: 'interview', rating: 4, jobPostingId: null, appliedAt: new Date('2024-01-02') },
        { id: 'c3', name: 'Alice', status: 'new', rating: 5, jobPostingId: 'j1', appliedAt: new Date('2024-01-03') },
      ];
      const result = await RecruitmentService.getHiringPipeline('org-1');
      assert.equal(result.new.length, 2);
      assert.equal(result.interview.length, 1);
      assert.equal(result.hired.length, 0);
    });

    it('applies jobPostingId filter', async () => {
      candFindManyImpl = async () => [];
      await RecruitmentService.getHiringPipeline('org-1', { jobPostingId: 'j1' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.jobPostingId, 'j1');
    });
  });

  describe('getHiringStats', () => {
    it('returns comprehensive hiring stats', async () => {
      jobCountImpl = async () => 5;
      jobGroupByImpl = async () => [{ status: 'published', _count: 3 }, { status: 'draft', _count: 2 }];
      candCountImpl = async () => 20;
      candGroupByImpl = async () => [{ status: 'new', _count: 10 }, { status: 'hired', _count: 5 }];
      ivCountImpl = async () => 8;
      offCountImpl = async () => 6;
      offGroupByImpl = async () => [{ status: 'accepted', _count: 3 }, { status: 'rejected', _count: 1 }, { status: 'sent', _count: 2 }];

      const result = await RecruitmentService.getHiringStats('org-1');
      assert.equal(result.totalJobs, 5);
      assert.equal(result.jobsByStatus.published, 3);
      assert.equal(result.totalCandidates, 20);
      assert.equal(result.candidatesByStatus.new, 10);
      assert.equal(result.totalInterviews, 8);
      assert.equal(result.totalOffers, 6);
      assert.equal(result.offersByStatus.accepted, 3);
      // acceptanceRate = accepted / (accepted + rejected) = 3/4 = 0.75
      assert.equal(result.acceptanceRate, 0.75);
    });

    it('returns 0 acceptance rate when no offers responded', async () => {
      jobCountImpl = async () => 0;
      candCountImpl = async () => 0;
      ivCountImpl = async () => 0;
      offCountImpl = async () => 0;
      offFindManyImpl = async () => [];
      const result = await RecruitmentService.getHiringStats('org-1');
      assert.equal(result.acceptanceRate, 0);
    });
  });
});
