import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type SessionFindManyArgs = {
  where: { workspaceId: string };
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type SessionFindUniqueArgs = {
  where: { id: string };
  include?: Record<string, unknown>;
};

type SessionCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string;
    query: string;
    status: string;
    ownerId?: string | null;
    agentRunId?: string | null;
  };
};

type SessionUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type SessionDeleteArgs = {
  where: { id: string };
};

type CitationFindManyArgs = {
  where: { researchSessionId: string };
  orderBy?: Record<string, unknown>;
  take?: number;
};

type CitationCreateArgs = {
  data: {
    researchSessionId: string;
    url: string;
    title?: string | null;
    snippet?: string | null;
    publishedAt?: Date | null;
    credibility: string;
    metadata: string;
  };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let sessionFindManyImpl: (args: SessionFindManyArgs) => Promise<unknown[]> = async () => [];
let sessionFindUniqueImpl: (args: SessionFindUniqueArgs) => Promise<unknown> = async () => null;
let sessionCreateImpl: (args: SessionCreateArgs) => Promise<unknown> = async () => ({});
let sessionUpdateImpl: (args: SessionUpdateArgs) => Promise<unknown> = async () => ({});
let sessionDeleteImpl: (args: SessionDeleteArgs) => Promise<unknown> = async () => ({});

let citationFindManyImpl: (args: CitationFindManyArgs) => Promise<unknown[]> = async () => [];
let citationCreateImpl: (args: CitationCreateArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  researchSession: {
    findMany: (args: SessionFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'researchSession.findMany', args });
      return sessionFindManyImpl(args);
    },
    findUnique: (args: SessionFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'researchSession.findUnique', args });
      return sessionFindUniqueImpl(args);
    },
    create: (args: SessionCreateArgs): Promise<unknown> => {
      calls.push({ method: 'researchSession.create', args });
      return sessionCreateImpl(args);
    },
    update: (args: SessionUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'researchSession.update', args });
      return sessionUpdateImpl(args);
    },
    delete: (args: SessionDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'researchSession.delete', args });
      return sessionDeleteImpl(args);
    },
  },
  citation: {
    findMany: (args: CitationFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'citation.findMany', args });
      return citationFindManyImpl(args);
    },
    create: (args: CitationCreateArgs): Promise<unknown> => {
      calls.push({ method: 'citation.create', args });
      return citationCreateImpl(args);
    },
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
  sessionFindManyImpl = async () => [];
  sessionFindUniqueImpl = async () => null;
  sessionCreateImpl = async () => ({});
  sessionUpdateImpl = async () => ({});
  sessionDeleteImpl = async () => ({});
  citationFindManyImpl = async () => [];
  citationCreateImpl = async () => ({});
}

const { ResearchService } = await import('@/lib/services/research');

// ─────────────────────────────────────────────────────────────────────────────
// ResearchService — Sessions
// ─────────────────────────────────────────────────────────────────────────────

describe('ResearchService — Sessions', () => {
  beforeEach(() => { resetMock(); });

  describe('listSessions', () => {
    it('returns research sessions for a workspace', async () => {
      sessionFindManyImpl = async () =>
        ([{ id: 's1', query: 'Market research', _count: { citations: 2 } }]);

      const result = await ResearchService.listSessions('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 's1');
      assert.equal(calls[0].method, 'researchSession.findMany');
      const args = calls[0].args as SessionFindManyArgs;
      assert.equal(args.where.workspaceId, 'ws-1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      sessionFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await ResearchService.listSessions('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('getSession', () => {
    it('returns a session by id with citations', async () => {
      sessionFindUniqueImpl = async () =>
        ({ id: 's1', query: 'Test', citations: [{ id: 'c1' }] });

      const result = await ResearchService.getSession('s1');

      assert.ok(result);
      assert.equal(result.id, 's1');
      assert.equal(calls[0].method, 'researchSession.findUnique');
    });

    it('returns null when session not found', async () => {
      sessionFindUniqueImpl = async () => null;

      const result = await ResearchService.getSession('nope');
      assert.equal(result, null);
    });
  });

  describe('createSession', () => {
    it('creates a session with pending status', async () => {
      sessionCreateImpl = async (args: SessionCreateArgs) => {
        assert.equal(args.data.status, 'pending');
        assert.equal(args.data.query, 'What are the latest marketing trends?');
        return { id: 's1', ...args.data };
      };

      const result = await ResearchService.createSession('ws-1', {
        organizationId: 'org-1',
        query: 'What are the latest marketing trends?',
      });

      assert.ok(result);
      assert.equal(result.id, 's1');
      assert.equal(calls[0].method, 'researchSession.create');
    });

    it('sets ownerId when provided', async () => {
      sessionCreateImpl = async (args: SessionCreateArgs) => {
        assert.equal(args.data.ownerId, 'user-1');
        return { id: 's1', ...args.data };
      };

      await ResearchService.createSession('ws-1', {
        organizationId: 'org-1',
        query: 'Test query',
        ownerId: 'user-1',
      });
    });
  });

  describe('updateSession', () => {
    it('updates status and serializes findings to JSON', async () => {
      sessionUpdateImpl = async (args: SessionUpdateArgs) => {
        assert.equal(args.data.status, 'completed');
        assert.equal(args.data.findings, JSON.stringify({ key: 'value' }));
        return { id: 's1', ...args.data };
      };

      const result = await ResearchService.updateSession('s1', {
        status: 'completed',
        findings: { key: 'value' },
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'researchSession.update');
    });

    it('sets startedAt when status becomes running', async () => {
      sessionUpdateImpl = async (args: SessionUpdateArgs) => {
        assert.equal(args.data.status, 'running');
        assert.ok(args.data.startedAt instanceof Date);
        return { id: 's1', ...args.data };
      };

      await ResearchService.updateSession('s1', { status: 'running' });
    });
  });

  describe('deleteSession', () => {
    it('deletes a session', async () => {
      sessionDeleteImpl = async () => ({ id: 's1' });

      const result = await ResearchService.deleteSession('s1');
      assert.ok(result);
      assert.equal(calls[0].method, 'researchSession.delete');
    });
  });

  describe('completeSession', () => {
    it('marks session as completed with summary and findings', async () => {
      sessionUpdateImpl = async (args: SessionUpdateArgs) => {
        assert.equal(args.data.status, 'completed');
        assert.equal(args.data.summary, 'Research complete');
        assert.equal(args.data.findings, JSON.stringify({ result: 'done' }));
        assert.ok(args.data.completedAt instanceof Date);
        return { id: 's1', ...args.data };
      };

      const result = await ResearchService.completeSession('s1', 'Research complete', { result: 'done' });
      assert.ok(result);
      assert.equal(calls[0].method, 'researchSession.update');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ResearchService — Citations
// ─────────────────────────────────────────────────────────────────────────────

describe('ResearchService — Citations', () => {
  beforeEach(() => { resetMock(); });

  describe('addCitation', () => {
    it('adds a citation with defaults', async () => {
      citationCreateImpl = async (args: CitationCreateArgs) => {
        assert.equal(args.data.researchSessionId, 's1');
        assert.equal(args.data.url, 'https://example.com');
        assert.equal(args.data.credibility, 'medium');
        assert.equal(args.data.metadata, '{}');
        return { id: 'c1', ...args.data };
      };

      const result = await ResearchService.addCitation('s1', {
        url: 'https://example.com',
      });

      assert.ok(result);
      assert.equal(result.id, 'c1');
      assert.equal(calls[0].method, 'citation.create');
    });

    it('serializes metadata to JSON', async () => {
      citationCreateImpl = async (args: CitationCreateArgs) => {
        assert.equal(args.data.metadata, JSON.stringify({ source: 'google' }));
        return { id: 'c1' };
      };

      await ResearchService.addCitation('s1', {
        url: 'https://example.com',
        metadata: { source: 'google' },
      });
    });
  });

  describe('listCitations', () => {
    it('returns citations for a session', async () => {
      citationFindManyImpl = async () =>
        ([{ id: 'c1', url: 'https://example.com', credibility: 'high' }]);

      const result = await ResearchService.listCitations('s1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'c1');
      assert.equal(calls[0].method, 'citation.findMany');
      const args = calls[0].args as CitationFindManyArgs;
      assert.equal(args.where.researchSessionId, 's1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      citationFindManyImpl = async () => { throw new Error('fail'); };

      const result = await ResearchService.listCitations('s1');
      assert.deepEqual(result, []);
    });
  });
});
