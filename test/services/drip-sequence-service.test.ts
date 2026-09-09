import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  lifecycle: string;
  tags: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EventRow {
  id: string;
  type: string;
  metadata: string;
  createdAt: Date;
}

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: unknown) => Promise<MemoryRow[]> = async () => [];
let memoryFindUniqueImpl: (args: unknown) => Promise<MemoryRow | null> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let memoryUpdateImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let memoryDeleteImpl: (args: unknown) => Promise<MemoryRow> = async () => ({}) as MemoryRow;
let eventCreateImpl: (args: unknown) => Promise<EventRow> = async () => ({}) as EventRow;

const prismaMock = {
  memory: {
    findMany: (args: unknown): Promise<MemoryRow[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: unknown): Promise<MemoryRow | null> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: unknown): Promise<MemoryRow> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
  },
  event: {
    create: (args: unknown): Promise<EventRow> => {
      calls.push({ method: 'event.create', args });
      return eventCreateImpl(args);
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

function makeSequenceMemory(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'seq-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'drip_sequence',
    content: JSON.stringify({
      name: 'Welcome Sequence',
      description: 'Onboarding drip',
      steps: [
        { id: 'step_1', name: 'Welcome', delayMinutes: 0, subject: 'Welcome!', bodyHtml: '<p>Hi</p>' },
        { id: 'step_2', name: 'Tips', delayMinutes: 1440, subject: 'Tips for you', bodyHtml: '<p>Tips</p>' },
      ],
      status: 'active',
      listId: null,
      trigger: 'manual',
    }),
    source: 'user',
    sourceId: 'user-1',
    confidence: 0.9,
    owner: 'user-1',
    lifecycle: 'long',
    tags: '["drip_sequence"]',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeEnrollmentMemory(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'enr-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'drip_enrollment',
    content: JSON.stringify({
      subscriberId: 'sub-1',
      sequenceId: 'seq-1',
      currentStep: 0,
      status: 'active',
      enrolledAt: new Date().toISOString(),
      nextStepAt: new Date(Date.now() - 60000).toISOString(),
      completedSteps: [],
    }),
    source: 'user',
    sourceId: 'user-1',
    confidence: 0.9,
    owner: 'user-1',
    lifecycle: 'medium',
    tags: '["drip_enrollment","seq-1","sub-1"]',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({}) as MemoryRow;
  memoryUpdateImpl = async () => ({}) as MemoryRow;
  memoryDeleteImpl = async () => ({}) as MemoryRow;
  eventCreateImpl = async () => ({}) as EventRow;
}

const { DripSequenceService } = await import('@/lib/services/drip-sequence-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('DripSequenceService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a drip sequence memory record with type drip_sequence', async () => {
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string } };
        assert.equal(a.data.type, 'drip_sequence');
        assert.ok(a.data.content.includes('"name":"Welcome Sequence"'));
        return makeSequenceMemory({ content: a.data.content });
      };

      const result = await DripSequenceService.create({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        createdBy: 'user-1',
        data: { name: 'Welcome Sequence', steps: [] },
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'memory.create');
    });
  });

  describe('get', () => {
    it('returns a drip sequence by id', async () => {
      memoryFindUniqueImpl = async () => makeSequenceMemory();

      const result = await DripSequenceService.get('seq-1');

      assert.ok(result);
      assert.equal(result!.id, 'seq-1');
      assert.equal(result!.name, 'Welcome Sequence');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await DripSequenceService.get('nonexistent');

      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('returns drip sequences for a workspace', async () => {
      memoryFindManyImpl = async () => [makeSequenceMemory()];

      const result = await DripSequenceService.list('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'seq-1');
    });
  });

  describe('update', () => {
    it('updates drip sequence data', async () => {
      memoryFindUniqueImpl = async () => makeSequenceMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.status, 'paused');
        return makeSequenceMemory({ content: a.data.content });
      };

      const result = await DripSequenceService.update('seq-1', { status: 'paused' });

      assert.ok(result);
      assert.equal(calls.some((c) => c.method === 'memory.update'), true);
    });

    it('throws when sequence not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(
        () => DripSequenceService.update('nonexistent', { name: 'Test' }),
        /Drip sequence not found/,
      );
    });
  });

  describe('delete', () => {
    it('deletes the drip sequence memory record', async () => {
      memoryDeleteImpl = async () => makeSequenceMemory();

      await DripSequenceService.delete('seq-1');

      assert.equal(calls[0].method, 'memory.delete');
    });
  });

  describe('addStep', () => {
    it('adds a step to the sequence', async () => {
      memoryFindUniqueImpl = async () => makeSequenceMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.steps.length, 3);
        return makeSequenceMemory({ content: a.data.content });
      };

      await DripSequenceService.addStep('seq-1', { name: 'Follow-up', delayMinutes: 2880, subject: 'Follow up' });

      assert.equal(calls.some((c) => c.method === 'memory.update'), true);
    });

    it('throws when sequence not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(
        () => DripSequenceService.addStep('nonexistent', { name: 'Step', delayMinutes: 60, subject: 'S' }),
        /Drip sequence not found/,
      );
    });
  });

  describe('removeStep', () => {
    it('removes a step from the sequence', async () => {
      memoryFindUniqueImpl = async () => makeSequenceMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.steps.length, 1);
        return makeSequenceMemory({ content: a.data.content });
      };

      await DripSequenceService.removeStep('seq-1', 'step_2');

      assert.equal(calls.some((c) => c.method === 'memory.update'), true);
    });
  });

  describe('enrollSubscriber', () => {
    it('creates an enrollment memory record', async () => {
      memoryFindUniqueImpl = async () => makeSequenceMemory();
      memoryCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string; content: string } };
        assert.equal(a.data.type, 'drip_enrollment');
        const content = JSON.parse(a.data.content);
        assert.equal(content.subscriberId, 'sub-1');
        assert.equal(content.sequenceId, 'seq-1');
        return makeEnrollmentMemory({ content: a.data.content });
      };

      const result = await DripSequenceService.enrollSubscriber('seq-1', 'sub-1', 'user-1');

      assert.ok(result);
      assert.equal(calls.some((c) => c.method === 'memory.create'), true);
    });

    it('throws when sequence not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(
        () => DripSequenceService.enrollSubscriber('nonexistent', 'sub-1', 'user-1'),
        /Drip sequence not found/,
      );
    });
  });

  describe('unenrollSubscriber', () => {
    it('cancels active enrollments for a subscriber', async () => {
      memoryFindManyImpl = async () => [makeEnrollmentMemory()];
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        const content = JSON.parse(a.data.content);
        assert.equal(content.status, 'cancelled');
        return makeEnrollmentMemory({ content: a.data.content });
      };

      const results = await DripSequenceService.unenrollSubscriber('seq-1', 'sub-1');

      assert.equal(results.length, 1);
    });

    it('skips non-active enrollments', async () => {
      memoryFindManyImpl = async () => [makeEnrollmentMemory({
        content: JSON.stringify({
          subscriberId: 'sub-1', sequenceId: 'seq-1', currentStep: 0,
          status: 'completed', enrolledAt: '2024-01-01', nextStepAt: '2024-01-01', completedSteps: [],
        }),
      })];

      const results = await DripSequenceService.unenrollSubscriber('seq-1', 'sub-1');

      assert.equal(results.length, 0);
    });
  });

  describe('getEnrollments', () => {
    it('returns enrollments for a sequence', async () => {
      memoryFindManyImpl = async () => [makeEnrollmentMemory()];

      const result = await DripSequenceService.getEnrollments('seq-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'enr-1');
    });
  });

  describe('getSubscriberProgress', () => {
    it('returns enrollments for a subscriber', async () => {
      memoryFindManyImpl = async () => [makeEnrollmentMemory()];

      const result = await DripSequenceService.getSubscriberProgress('sub-1');

      assert.equal(result.length, 1);
    });
  });

  describe('processPendingSteps', () => {
    it('processes active enrollments whose nextStepAt has passed', async () => {
      // First findMany: active enrollments
      // Then findUnique: the sequence
      let findManyCallCount = 0;
      memoryFindManyImpl = async (args: unknown) => {
        findManyCallCount++;
        return [makeEnrollmentMemory()];
      };
      memoryFindUniqueImpl = async () => makeSequenceMemory();
      memoryUpdateImpl = async (args: unknown) => {
        const a = args as { data: { content: string } };
        return makeEnrollmentMemory({ content: a.data.content });
      };
      eventCreateImpl = async (args: unknown) => {
        const a = args as { data: { type: string } };
        assert.equal(a.data.type, 'drip.step_sent');
        return { id: 'evt-1', type: 'drip.step_sent', metadata: '{}', createdAt: new Date() };
      };

      const result = await DripSequenceService.processPendingSteps();

      assert.equal(result.processed, 1);
      assert.equal(result.events.length, 1);
    });

    it('skips enrollments whose nextStepAt has not passed', async () => {
      memoryFindManyImpl = async () => [makeEnrollmentMemory({
        content: JSON.stringify({
          subscriberId: 'sub-1', sequenceId: 'seq-1', currentStep: 0,
          status: 'active', enrolledAt: new Date().toISOString(),
          nextStepAt: new Date(Date.now() + 600000).toISOString(), // future
          completedSteps: [],
        }),
      })];

      const result = await DripSequenceService.processPendingSteps();

      assert.equal(result.processed, 0);
    });
  });

  describe('getStats', () => {
    it('returns aggregate drip sequence stats', async () => {
      // list() calls findMany for sequences, then getStats calls findMany for enrollments
      let callCount = 0;
      memoryFindManyImpl = async (args: unknown) => {
        callCount++;
        const a = args as { where: { type: string } };
        if (a.where.type === 'drip_enrollment') {
          return [
            makeEnrollmentMemory({ content: JSON.stringify({ subscriberId: 's1', sequenceId: 'seq-1', currentStep: 0, status: 'active', enrolledAt: '2024-01-01', nextStepAt: '2024-01-01', completedSteps: [] }) }),
            makeEnrollmentMemory({ id: 'enr-2', content: JSON.stringify({ subscriberId: 's2', sequenceId: 'seq-1', currentStep: 2, status: 'completed', enrolledAt: '2024-01-01', nextStepAt: '2024-01-01', completedSteps: ['step_1', 'step_2'] }) }),
          ];
        }
        return [makeSequenceMemory()];
      };

      const result = await DripSequenceService.getStats('ws-1');

      assert.equal(result.total, 1);
      assert.equal(result.totalEnrollments, 2);
      assert.equal(result.activeEnrollments, 1);
      assert.equal(result.completedEnrollments, 1);
    });
  });
});
