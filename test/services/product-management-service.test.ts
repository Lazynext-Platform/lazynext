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

let ideaFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let ideaFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let ideaCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let ideaUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let ideaDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let ideaCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let ideaGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

let releaseFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let releaseFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let releaseCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let releaseUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let releaseDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let releaseCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let releaseGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

let roadmapFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let roadmapFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let roadmapCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let roadmapUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let roadmapDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let roadmapCountImpl: (args: CountArgs) => Promise<number> = async () => 0;
let roadmapGroupByImpl: (args: GroupByArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  featureIdea: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'featureIdea.findMany', args }); return ideaFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'featureIdea.findUnique', args }); return ideaFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'featureIdea.create', args }); return ideaCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'featureIdea.update', args }); return ideaUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'featureIdea.delete', args }); return ideaDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'featureIdea.count', args }); return ideaCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'featureIdea.groupBy', args }); return ideaGroupByImpl(args); },
  },
  release: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'release.findMany', args }); return releaseFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'release.findUnique', args }); return releaseFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'release.create', args }); return releaseCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'release.update', args }); return releaseUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'release.delete', args }); return releaseDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'release.count', args }); return releaseCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'release.groupBy', args }); return releaseGroupByImpl(args); },
  },
  roadmapItem: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'roadmapItem.findMany', args }); return roadmapFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'roadmapItem.findUnique', args }); return roadmapFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'roadmapItem.create', args }); return roadmapCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'roadmapItem.update', args }); return roadmapUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'roadmapItem.delete', args }); return roadmapDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'roadmapItem.count', args }); return roadmapCountImpl(args); },
    groupBy: (args: GroupByArgs): Promise<unknown[]> => { calls.push({ method: 'roadmapItem.groupBy', args }); return roadmapGroupByImpl(args); },
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
  ideaFindManyImpl = async () => [];
  ideaFindUniqueImpl = async () => null;
  ideaCreateImpl = async () => ({});
  ideaUpdateImpl = async () => ({});
  ideaDeleteImpl = async () => ({});
  ideaCountImpl = async () => 0;
  ideaGroupByImpl = async () => [];
  releaseFindManyImpl = async () => [];
  releaseFindUniqueImpl = async () => null;
  releaseCreateImpl = async () => ({});
  releaseUpdateImpl = async () => ({});
  releaseDeleteImpl = async () => ({});
  releaseCountImpl = async () => 0;
  releaseGroupByImpl = async () => [];
  roadmapFindManyImpl = async () => [];
  roadmapFindUniqueImpl = async () => null;
  roadmapCreateImpl = async () => ({});
  roadmapUpdateImpl = async () => ({});
  roadmapDeleteImpl = async () => ({});
  roadmapCountImpl = async () => 0;
  roadmapGroupByImpl = async () => [];
}

const { FeatureIdeaService, ReleaseService, RoadmapService, ProductManagementService } =
  await import('@/lib/services/product-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// FeatureIdeaService
// ─────────────────────────────────────────────────────────────────────────────

describe('FeatureIdeaService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns ideas for an organization', async () => {
      ideaFindManyImpl = async () => [{ id: 'i1', title: 'Dark Mode', votes: 5 }];

      const result = await FeatureIdeaService.list('org-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'i1');
      assert.equal(calls[0].method, 'featureIdea.findMany');
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies status, priority, and category filters', async () => {
      ideaFindManyImpl = async () => [];

      await FeatureIdeaService.list('org-1', { status: 'backlog', priority: 'high', category: 'bug' });

      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'backlog');
      assert.equal(args.where.priority, 'high');
      assert.equal(args.where.category, 'bug');
    });

    it('applies search filter with OR clause', async () => {
      ideaFindManyImpl = async () => [];

      await FeatureIdeaService.list('org-1', { search: 'dark' });

      const args = calls[0].args as FindManyArgs;
      assert.ok(args.where.OR);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      ideaFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await FeatureIdeaService.list('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('get', () => {
    it('returns an idea by id', async () => {
      ideaFindUniqueImpl = async () => ({ id: 'i1', title: 'Test' });

      const result = await FeatureIdeaService.get('i1');
      assert.ok(result);
      assert.equal(result.id, 'i1');
    });

    it('returns null when not found', async () => {
      ideaFindUniqueImpl = async () => null;
      const result = await FeatureIdeaService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('creates an idea with defaults', async () => {
      ideaCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.category, 'feature');
        assert.equal(args.data.status, 'idea');
        assert.equal(args.data.priority, 'medium');
        assert.equal(args.data.impact, 3);
        assert.equal(args.data.effort, 3);
        return { id: 'i1', ...args.data };
      };

      const result = await FeatureIdeaService.create({
        organizationId: 'org-1',
        title: 'New Feature',
        submittedById: 'u1',
      });

      assert.ok(result);
      assert.equal(result.id, 'i1');
    });

    it('clamps impact and effort to 1-5 range', async () => {
      ideaCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.impact, 5);
        assert.equal(args.data.effort, 1);
        return { id: 'i1', ...args.data };
      };

      await FeatureIdeaService.create({
        organizationId: 'org-1',
        title: 'Test',
        submittedById: 'u1',
        impact: 99,
        effort: -5,
      });
    });

    it('serializes tags as JSON array string', async () => {
      ideaCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.tags, JSON.stringify(['ui', 'mobile']));
        return { id: 'i1', ...args.data };
      };

      await FeatureIdeaService.create({
        organizationId: 'org-1',
        title: 'Test',
        submittedById: 'u1',
        tags: ['ui', 'mobile'],
      });
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      ideaUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.title, 'Updated');
        assert.equal(args.data.description, undefined);
        return { id: 'i1', ...args.data };
      };

      const result = await FeatureIdeaService.update('i1', { title: 'Updated' });
      assert.ok(result);
    });

    it('clamps impact on update', async () => {
      ideaUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.impact, 5);
        return { id: 'i1', ...args.data };
      };

      await FeatureIdeaService.update('i1', { impact: 10 });
    });
  });

  describe('delete', () => {
    it('deletes an idea', async () => {
      ideaDeleteImpl = async () => ({ id: 'i1' });

      const result = await FeatureIdeaService.delete('i1');
      assert.ok(result);
      assert.equal(calls[0].method, 'featureIdea.delete');
    });
  });

  describe('vote', () => {
    it('adds a vote when user has not voted', async () => {
      ideaFindUniqueImpl = async () => ({ id: 'i1', votes: 0, voters: '[]' });
      ideaUpdateImpl = async (args: UpdateArgs) => ({ id: 'i1', votes: args.data.votes, voters: args.data.voters });

      const result = await FeatureIdeaService.vote('i1', 'u1') as { voted: boolean; votes: number };

      assert.equal(result.voted, true);
      assert.equal(result.votes, 1);
    });

    it('removes a vote when user has already voted (toggle)', async () => {
      ideaFindUniqueImpl = async () => ({ id: 'i1', votes: 2, voters: JSON.stringify(['u1', 'u2']) });
      ideaUpdateImpl = async (args: UpdateArgs) => ({ id: 'i1', votes: args.data.votes, voters: args.data.voters });

      const result = await FeatureIdeaService.vote('i1', 'u1') as { voted: boolean; votes: number };

      assert.equal(result.voted, false);
      assert.equal(result.votes, 1);
    });

    it('throws when idea not found', async () => {
      ideaFindUniqueImpl = async () => null;

      await assert.rejects(() => FeatureIdeaService.vote('nope', 'u1'), /idea_not_found/);
    });
  });

  describe('getVotes', () => {
    it('returns votes and voters array', async () => {
      ideaFindUniqueImpl = async () => ({ votes: 2, voters: JSON.stringify(['u1', 'u2']) });

      const result = await FeatureIdeaService.getVotes('i1');
      assert.equal(result.votes, 2);
      assert.deepEqual(result.voters, ['u1', 'u2']);
    });

    it('returns zeros when idea not found', async () => {
      ideaFindUniqueImpl = async () => null;
      const result = await FeatureIdeaService.getVotes('nope');
      assert.equal(result.votes, 0);
      assert.deepEqual(result.voters, []);
    });
  });

  describe('getTopIdeas', () => {
    it('returns top ideas ordered by votes', async () => {
      ideaFindManyImpl = async () => [{ id: 'i1', votes: 10 }, { id: 'i2', votes: 5 }];

      const result = await FeatureIdeaService.getTopIdeas('org-1', 5);
      assert.equal(result.length, 2);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.take, 5);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ReleaseService
// ─────────────────────────────────────────────────────────────────────────────

describe('ReleaseService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns releases for an organization', async () => {
      releaseFindManyImpl = async () => [{ id: 'r1', name: 'v1.0' }];

      const result = await ReleaseService.list('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'r1');
    });

    it('applies status filter', async () => {
      releaseFindManyImpl = async () => [];

      await ReleaseService.list('org-1', { status: 'released' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'released');
    });
  });

  describe('get', () => {
    it('returns a release by id', async () => {
      releaseFindUniqueImpl = async () => ({ id: 'r1', name: 'v1.0' });
      const result = await ReleaseService.get('r1');
      assert.ok(result);
      assert.equal(result.id, 'r1');
    });
  });

  describe('create', () => {
    it('creates a release with defaults', async () => {
      releaseCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.status, 'planned');
        assert.equal(args.data.version, '');
        return { id: 'r1', ...args.data };
      };

      const result = await ReleaseService.create({
        organizationId: 'org-1',
        name: 'v1.0',
        createdBy: 'u1',
      });
      assert.ok(result);
    });
  });

  describe('update', () => {
    it('updates release status', async () => {
      releaseUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'released');
        return { id: 'r1', ...args.data };
      };

      const result = await ReleaseService.update('r1', { status: 'released' });
      assert.ok(result);
    });
  });

  describe('delete', () => {
    it('deletes a release', async () => {
      releaseDeleteImpl = async () => ({ id: 'r1' });
      const result = await ReleaseService.delete('r1');
      assert.ok(result);
    });
  });

  describe('addFeature', () => {
    it('adds a feature to the release features array', async () => {
      releaseFindUniqueImpl = async () => ({ id: 'r1', features: '[]' });
      releaseUpdateImpl = async (args: UpdateArgs) => ({ id: 'r1', features: args.data.features });
      ideaUpdateImpl = async () => ({ id: 'f1' });

      const result = await ReleaseService.addFeature('r1', 'f1') as { features: string };
      const features = JSON.parse(result.features);
      assert.ok(features.includes('f1'));
    });

    it('does not duplicate features already in the release', async () => {
      releaseFindUniqueImpl = async () => ({ id: 'r1', features: JSON.stringify(['f1']) });
      releaseUpdateImpl = async (args: UpdateArgs) => ({ id: 'r1', features: args.data.features });
      ideaUpdateImpl = async () => ({ id: 'f1' });

      const result = await ReleaseService.addFeature('r1', 'f1') as { features: string };
      const features = JSON.parse(result.features);
      assert.equal(features.length, 1);
    });

    it('throws when release not found', async () => {
      releaseFindUniqueImpl = async () => null;
      await assert.rejects(() => ReleaseService.addFeature('nope', 'f1'), /release_not_found/);
    });
  });

  describe('removeFeature', () => {
    it('removes a feature from the release', async () => {
      releaseFindUniqueImpl = async () => ({ id: 'r1', features: JSON.stringify(['f1', 'f2']) });
      releaseUpdateImpl = async (args: UpdateArgs) => ({ id: 'r1', features: args.data.features });
      ideaUpdateImpl = async () => ({ id: 'f1' });

      const result = await ReleaseService.removeFeature('r1', 'f1') as { features: string };
      const features = JSON.parse(result.features);
      assert.ok(!features.includes('f1'));
      assert.ok(features.includes('f2'));
    });
  });

  describe('generateChangelog', () => {
    it('generates a changelog from release features', async () => {
      releaseFindUniqueImpl = async () => ({ id: 'r1', name: 'v1.0', version: '1.0', features: JSON.stringify(['f1', 'f2']) });
      ideaFindManyImpl = async () => [
        { id: 'f1', title: 'Dark Mode', category: 'feature' },
        { id: 'f2', title: 'Fix crash', category: 'bug' },
      ];
      releaseUpdateImpl = async (args: UpdateArgs) => ({ id: 'r1', changelog: args.data.changelog });

      const result = await ReleaseService.generateChangelog('r1') as { changelog: string };
      assert.ok(result.changelog.includes('Dark Mode'));
      assert.ok(result.changelog.includes('Fix crash'));
      assert.ok(result.changelog.includes('New Features'));
      assert.ok(result.changelog.includes('Bug Fixes'));
    });

    it('throws when release not found', async () => {
      releaseFindUniqueImpl = async () => null;
      await assert.rejects(() => ReleaseService.generateChangelog('nope'), /release_not_found/);
    });
  });

  describe('getStats', () => {
    it('returns total and byStatus counts', async () => {
      releaseCountImpl = async () => 5;
      releaseGroupByImpl = async () => [{ status: 'released', _count: 2 }, { status: 'planned', _count: 3 }];

      const result = await ReleaseService.getStats('org-1');
      assert.equal(result.total, 5);
      assert.equal(result.byStatus.released, 2);
      assert.equal(result.byStatus.planned, 3);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RoadmapService
// ─────────────────────────────────────────────────────────────────────────────

describe('RoadmapService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns roadmap items for an organization', async () => {
      roadmapFindManyImpl = async () => [{ id: 'rm1', title: 'Q1 Goal' }];

      const result = await RoadmapService.list('org-1');
      assert.equal(result.length, 1);
    });

    it('applies quarter and status filters', async () => {
      roadmapFindManyImpl = async () => [];

      await RoadmapService.list('org-1', { quarter: '2024 Q1', status: 'on_track' });
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.quarter, '2024 Q1');
      assert.equal(args.where.status, 'on_track');
    });
  });

  describe('get', () => {
    it('returns a roadmap item by id', async () => {
      roadmapFindUniqueImpl = async () => ({ id: 'rm1', title: 'Q1 Goal' });
      const result = await RoadmapService.get('rm1');
      assert.ok(result);
    });
  });

  describe('create', () => {
    it('creates a roadmap item with defaults', async () => {
      roadmapCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.status, 'planned');
        assert.equal(args.data.position, 0);
        return { id: 'rm1', ...args.data };
      };

      const result = await RoadmapService.create({
        organizationId: 'org-1',
        title: 'Q1 Goal',
        createdBy: 'u1',
      });
      assert.ok(result);
    });
  });

  describe('update', () => {
    it('updates roadmap item status', async () => {
      roadmapUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'done');
        return { id: 'rm1', ...args.data };
      };

      const result = await RoadmapService.update('rm1', { status: 'done' });
      assert.ok(result);
    });
  });

  describe('delete', () => {
    it('deletes a roadmap item', async () => {
      roadmapDeleteImpl = async () => ({ id: 'rm1' });
      const result = await RoadmapService.delete('rm1');
      assert.ok(result);
    });
  });

  describe('getRoadmapByQuarter', () => {
    it('returns items for a specific quarter', async () => {
      roadmapFindManyImpl = async () => [{ id: 'rm1', quarter: '2024 Q1' }];

      const result = await RoadmapService.getRoadmapByQuarter('org-1', '2024 Q1');
      assert.equal(result.length, 1);
      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.quarter, '2024 Q1');
    });
  });

  describe('getStats', () => {
    it('returns total and byStatus counts', async () => {
      roadmapCountImpl = async () => 3;
      roadmapGroupByImpl = async () => [{ status: 'done', _count: 1 }, { status: 'planned', _count: 2 }];

      const result = await RoadmapService.getStats('org-1');
      assert.equal(result.total, 3);
      assert.equal(result.byStatus.done, 1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ProductManagementService (overall stats)
// ─────────────────────────────────────────────────────────────────────────────

describe('ProductManagementService', () => {
  beforeEach(() => { resetMock(); });

  it('getStats aggregates ideas, releases, and roadmap', async () => {
    ideaCountImpl = async () => 10;
    ideaGroupByImpl = async () => [{ status: 'idea', _count: 4 }, { status: 'shipped', _count: 6 }];
    releaseCountImpl = async () => 3;
    releaseGroupByImpl = async () => [{ status: 'released', _count: 2 }];
    roadmapCountImpl = async () => 5;
    roadmapGroupByImpl = async () => [{ status: 'planned', _count: 3 }];

    const result = await ProductManagementService.getStats('org-1');

    assert.equal(result.totalIdeas, 10);
    assert.equal(result.ideasByStatus.idea, 4);
    assert.equal(result.ideasByStatus.shipped, 6);
    assert.equal(result.releases.total, 3);
    assert.equal(result.roadmap.total, 5);
  });

  it('exposes FeatureIdea, Release, and Roadmap sub-services', () => {
    assert.ok(ProductManagementService.FeatureIdea);
    assert.ok(ProductManagementService.Release);
    assert.ok(ProductManagementService.Roadmap);
  });
});
