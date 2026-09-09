import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MemoryFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};
type MemoryFindUniqueArgs = { where: { id: string } };
type MemoryCreateArgs = { data: Record<string, unknown> };
type MemoryUpdateArgs = { where: { id: string }; data: Record<string, unknown> };

type TaskFindUniqueArgs = { where: { id: string }; select?: Record<string, unknown> };
type TaskCreateArgs = { data: Record<string, unknown> };

type WorkspaceFindUniqueArgs = { where: { id: string }; select?: Record<string, unknown> };

type EventCreateArgs = { data: Record<string, unknown> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// ── Prisma mock implementations ──

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> = async () => [];
let memoryFindUniqueImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> = async () => ({});
let memoryUpdateImpl: (args: MemoryUpdateArgs) => Promise<unknown> = async () => ({});

let taskFindUniqueImpl: (args: TaskFindUniqueArgs) => Promise<unknown> = async () => null;
let taskCreateImpl: (args: TaskCreateArgs) => Promise<unknown> = async () => ({ id: 'subtask-1' });

let workspaceFindUniqueImpl: (args: WorkspaceFindUniqueArgs) => Promise<unknown> = async () => ({ organizationId: 'org-1' });

let eventCreateImpl: (args: EventCreateArgs) => Promise<unknown> = async () => ({ id: 'evt-1' });

// ── MemoryService mock ──

let memoryServiceCreateImpl: (input: Record<string, unknown>) => Promise<unknown> = async () => ({ id: 'mem-1' });

// ── EventService mock ──

let eventServiceEmitImpl: (input: Record<string, unknown>) => Promise<unknown> = async () => ({ id: 'evt-1' });

const prismaMock = {
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: MemoryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: MemoryUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
  },
  task: {
    findUnique: (args: TaskFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'task.findUnique', args });
      return taskFindUniqueImpl(args);
    },
    create: (args: TaskCreateArgs): Promise<unknown> => {
      calls.push({ method: 'task.create', args });
      return taskCreateImpl(args);
    },
  },
  workspace: {
    findUnique: (args: WorkspaceFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'workspace.findUnique', args });
      return workspaceFindUniqueImpl(args);
    },
  },
  event: {
    create: (args: EventCreateArgs): Promise<unknown> => {
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

mock.module('@/lib/services/memory', {
  namedExports: {
    MemoryService: {
      create: (input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'MemoryService.create', args: input });
        return memoryServiceCreateImpl(input);
      },
      assembleContext: async () => ({ memories: [], summary: '0 memories' }),
    },
  },
});

mock.module('@/lib/services/event', {
  namedExports: {
    EventService: {
      emit: (input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'EventService.emit', args: input });
        return eventServiceEmitImpl(input);
      },
    },
  },
});

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({ id: 'mem-1', createdAt: new Date('2024-01-01'), owner: null, content: '' });
  memoryUpdateImpl = async () => ({ id: 'mem-1' });

  taskFindUniqueImpl = async () => null;
  taskCreateImpl = async () => ({ id: 'subtask-1' });

  workspaceFindUniqueImpl = async () => ({ organizationId: 'org-1' });

  eventCreateImpl = async () => ({ id: 'evt-1' });

  memoryServiceCreateImpl = async () => ({ id: 'mem-1', createdAt: new Date('2024-01-01'), owner: null, content: '' });
  eventServiceEmitImpl = async () => ({ id: 'evt-1' });
}

const { AgentCommunication } = await import('@/lib/services/agent-communication');

// ─────────────────────────────────────────────────────────────────────────────
// AgentCommunication
// ─────────────────────────────────────────────────────────────────────────────

describe('AgentCommunication', () => {
  beforeEach(() => { resetMock(); });

  // ── sendMessage ──
  describe('sendMessage', () => {
    it('stores a message as a Memory with agent_message tags', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'decision');
        const tags = JSON.parse(args.data.tags as string) as string[];
        assert.ok(tags.includes('agent_message'));
        assert.ok(tags.includes('request'));
        return { id: 'msg-1', createdAt: new Date('2024-01-01'), owner: 'agent-2', content: '' };
      };

      const result = await AgentCommunication.sendMessage('ws-1', {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        type: 'request',
        content: 'Can you help with the design?',
      });

      assert.equal(result.fromAgentId, 'agent-1');
      assert.equal(result.toAgentId, 'agent-2');
      assert.equal(result.type, 'request');
      assert.equal(result.content, 'Can you help with the design?');
    });

    it('emits an agent.message_sent event', async () => {
      memoryCreateImpl = async () => ({ id: 'msg-1', createdAt: new Date('2024-01-01'), owner: 'agent-2', content: '' });

      await AgentCommunication.sendMessage('ws-1', {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        type: 'notification',
        content: 'Task completed',
      });

      const emitCall = calls.find((c) => c.method === 'EventService.emit');
      assert.ok(emitCall);
      const args = emitCall!.args as Record<string, unknown>;
      assert.equal(args.type, 'agent.message_sent');
    });

    it('stores taskId and collaborationId in the message content', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.taskId, 'task-1');
        assert.equal(content.collaborationId, 'collab-1');
        return { id: 'msg-1', createdAt: new Date('2024-01-01'), owner: 'agent-2', content: '' };
      };

      await AgentCommunication.sendMessage('ws-1', {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        type: 'question',
        content: 'What format?',
        taskId: 'task-1',
        collaborationId: 'collab-1',
      });
    });
  });

  // ── getMessages ──
  describe('getMessages', () => {
    it('returns messages filtered by agent_message tag', async () => {
      memoryFindManyImpl = async () => ([
        {
          id: 'msg-1',
          content: JSON.stringify({ fromAgentId: 'a1', toAgentId: 'a2', type: 'request', content: 'Hello' }),
          owner: 'a2',
          sourceId: null,
          tags: JSON.stringify(['agent_message', 'request']),
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'mem-2',
          content: JSON.stringify({ title: 'Not a message' }),
          owner: null,
          sourceId: null,
          tags: JSON.stringify(['other']),
          createdAt: new Date('2024-01-02'),
        },
      ]);

      const result = await AgentCommunication.getMessages('ws-1', 'a2');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'msg-1');
      assert.equal(result[0].content, 'Hello');
    });

    it('filters by direction=sent', async () => {
      memoryFindManyImpl = async () => ([
        {
          id: 'msg-1',
          content: JSON.stringify({ fromAgentId: 'a1', toAgentId: 'a2', type: 'request', content: 'Sent' }),
          owner: 'a2',
          sourceId: null,
          tags: JSON.stringify(['agent_message']),
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'msg-2',
          content: JSON.stringify({ fromAgentId: 'a2', toAgentId: 'a1', type: 'response', content: 'Received' }),
          owner: 'a1',
          sourceId: null,
          tags: JSON.stringify(['agent_message']),
          createdAt: new Date('2024-01-02'),
        },
      ]);

      const result = await AgentCommunication.getMessages('ws-1', 'a1', { direction: 'sent' });

      assert.equal(result.length, 1);
      assert.equal(result[0].fromAgentId, 'a1');
    });

    it('filters by type', async () => {
      memoryFindManyImpl = async () => ([
        {
          id: 'msg-1',
          content: JSON.stringify({ fromAgentId: 'a1', toAgentId: 'a2', type: 'request', content: 'Req' }),
          owner: 'a2',
          sourceId: null,
          tags: JSON.stringify(['agent_message', 'request']),
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'msg-2',
          content: JSON.stringify({ fromAgentId: 'a1', toAgentId: 'a3', type: 'notification', content: 'Notif' }),
          owner: 'a3',
          sourceId: null,
          tags: JSON.stringify(['agent_message', 'notification']),
          createdAt: new Date('2024-01-02'),
        },
      ]);

      const result = await AgentCommunication.getMessages('ws-1', 'a1', { type: 'request' });

      assert.equal(result.length, 1);
      assert.equal(result[0].type, 'request');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await AgentCommunication.getMessages('ws-1', 'a1');
      assert.deepEqual(result, []);
    });
  });

  // ── getConversation ──
  describe('getConversation', () => {
    it('returns messages between two agents in both directions', async () => {
      memoryFindManyImpl = async () => ([
        {
          id: 'msg-1',
          content: JSON.stringify({ fromAgentId: 'a1', toAgentId: 'a2', type: 'request', content: 'Hi a2' }),
          owner: 'a2',
          sourceId: null,
          tags: JSON.stringify(['agent_message']),
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'msg-2',
          content: JSON.stringify({ fromAgentId: 'a2', toAgentId: 'a1', type: 'response', content: 'Hi a1' }),
          owner: 'a1',
          sourceId: null,
          tags: JSON.stringify(['agent_message']),
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'msg-3',
          content: JSON.stringify({ fromAgentId: 'a1', toAgentId: 'a3', type: 'request', content: 'To a3' }),
          owner: 'a3',
          sourceId: null,
          tags: JSON.stringify(['agent_message']),
          createdAt: new Date('2024-01-03'),
        },
      ]);

      const result = await AgentCommunication.getConversation('ws-1', 'a1', 'a2');

      assert.equal(result.length, 2);
      assert.ok(result.every((m) =>
        (m.fromAgentId === 'a1' && m.toAgentId === 'a2') ||
        (m.fromAgentId === 'a2' && m.toAgentId === 'a1'),
      ));
    });

    it('returns empty array when no conversation exists', async () => {
      memoryFindManyImpl = async () => [];

      const result = await AgentCommunication.getConversation('ws-1', 'a1', 'a2');
      assert.deepEqual(result, []);
    });
  });

  // ── broadcastMessage ──
  describe('broadcastMessage', () => {
    it('creates a message for each recipient', async () => {
      let createCount = 0;
      memoryCreateImpl = async () => {
        createCount++;
        return { id: `msg-${createCount}`, createdAt: new Date('2024-01-01'), owner: 'agent', content: '' };
      };

      const result = await AgentCommunication.broadcastMessage('ws-1', {
        fromAgentId: 'agent-1',
        toAgentIds: ['agent-2', 'agent-3', 'agent-4'],
        type: 'notification',
        content: 'Team update',
      });

      assert.equal(result.count, 3);
      assert.equal(result.messages.length, 3);
      assert.equal(createCount, 3);
    });

    it('emits an event for each message sent', async () => {
      memoryCreateImpl = async () => ({ id: 'msg-1', createdAt: new Date('2024-01-01'), owner: 'agent', content: '' });

      await AgentCommunication.broadcastMessage('ws-1', {
        fromAgentId: 'agent-1',
        toAgentIds: ['agent-2', 'agent-3'],
        type: 'notification',
        content: 'Update',
      });

      const emitCalls = calls.filter((c) => c.method === 'EventService.emit');
      assert.equal(emitCalls.length, 2);
    });
  });

  // ── requestAssistance ──
  describe('requestAssistance', () => {
    it('creates a sub-task for the requested agent', async () => {
      taskFindUniqueImpl = async () => ({ id: 'task-1', projectId: 'proj-1', title: 'Parent Task' });
      taskCreateImpl = async (args: TaskCreateArgs) => {
        assert.equal(args.data.parentTaskId, 'task-1');
        assert.equal(args.data.assignedAgentId, 'agent-2');
        assert.equal(args.data.priority, 'high');
        return { id: 'subtask-1' };
      };

      const result = await AgentCommunication.requestAssistance('ws-1', {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        taskId: 'task-1',
        requestType: 'design_review',
        description: 'Need design review for the new ad',
      });

      assert.equal(result.fromAgentId, 'agent-1');
      assert.equal(result.toAgentId, 'agent-2');
      assert.equal(result.status, 'pending');
      assert.equal(result.requestType, 'design_review');
    });

    it('sends a message to the target agent', async () => {
      taskFindUniqueImpl = async () => ({ id: 'task-1', projectId: 'proj-1', title: 'Parent' });

      await AgentCommunication.requestAssistance('ws-1', {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        taskId: 'task-1',
        requestType: 'code_review',
        description: 'Review my code',
      });

      // memory.create is called for the message
      const createCalls = calls.filter((c) => c.method === 'memory.create');
      assert.ok(createCalls.length >= 1);
    });

    it('emits an agent.assistance_requested event', async () => {
      taskFindUniqueImpl = async () => ({ id: 'task-1', projectId: 'proj-1', title: 'Parent' });

      await AgentCommunication.requestAssistance('ws-1', {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        taskId: 'task-1',
        requestType: 'help',
        description: 'Need help',
      });

      const emitCalls = calls.filter((c) => c.method === 'EventService.emit');
      const assistCall = emitCalls.find((c) => {
        const args = c.args as Record<string, unknown>;
        return args.type === 'agent.assistance_requested';
      });
      assert.ok(assistCall, 'Should emit agent.assistance_requested event');
    });
  });

  // ── respondToAssistance ──
  describe('respondToAssistance', () => {
    it('updates the request status to accepted', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'req-1',
        content: JSON.stringify({
          fromAgentId: 'agent-1',
          toAgentId: 'agent-2',
          taskId: 'task-1',
          requestType: 'review',
          description: 'Review needed',
          status: 'pending',
        }),
        tags: JSON.stringify(['agent_message', 'assistance_request']),
        owner: 'agent-2',
        sourceId: 'task-1',
        createdAt: new Date('2024-01-01'),
      });

      const result = await AgentCommunication.respondToAssistance('ws-1', {
        requestId: 'req-1',
        fromAgentId: 'agent-2',
        response: 'accepted',
      });

      assert.equal(result.response, 'accepted');
      assert.equal(result.status, 'accepted');

      // Verify memory.update was called
      const updateCall = calls.find((c) => c.method === 'memory.update');
      assert.ok(updateCall);
    });

    it('notifies the requesting agent with a response message', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'req-1',
        content: JSON.stringify({
          fromAgentId: 'agent-1',
          toAgentId: 'agent-2',
          taskId: 'task-1',
          status: 'pending',
        }),
        tags: JSON.stringify(['agent_message']),
        owner: 'agent-2',
        sourceId: 'task-1',
        createdAt: new Date('2024-01-01'),
      });

      await AgentCommunication.respondToAssistance('ws-1', {
        requestId: 'req-1',
        fromAgentId: 'agent-2',
        response: 'completed',
        result: 'All done',
      });

      // A message should be sent to agent-1 (the original requester) via prisma.memory.create
      const createCalls = calls.filter((c) => c.method === 'memory.create');
      assert.ok(createCalls.length >= 1);
      // Check that at least one message has toAgentId = 'agent-1'
      const msgCreate = createCalls.find((c) => {
        const data = (c.args as Record<string, unknown>).data as Record<string, unknown>;
        const content = JSON.parse(data.content as string);
        return content.toAgentId === 'agent-1';
      });
      assert.ok(msgCreate, 'Should send a notification message to the original requester');
    });

    it('emits an agent.assistance_responded event', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'req-1',
        content: JSON.stringify({
          fromAgentId: 'agent-1',
          toAgentId: 'agent-2',
          taskId: 'task-1',
          status: 'pending',
        }),
        tags: JSON.stringify(['agent_message']),
        owner: 'agent-2',
        sourceId: 'task-1',
        createdAt: new Date('2024-01-01'),
      });

      await AgentCommunication.respondToAssistance('ws-1', {
        requestId: 'req-1',
        fromAgentId: 'agent-2',
        response: 'declined',
      });

      const emitCalls = calls.filter((c) => c.method === 'EventService.emit');
      const assistRespCall = emitCalls.find((c) => {
        const args = c.args as Record<string, unknown>;
        return args.type === 'agent.assistance_responded';
      });
      assert.ok(assistRespCall, 'Should emit agent.assistance_responded event');
    });

    it('handles declined response correctly', async () => {
      memoryFindUniqueImpl = async () => ({
        id: 'req-1',
        content: JSON.stringify({
          fromAgentId: 'agent-1',
          toAgentId: 'agent-2',
          taskId: 'task-1',
          status: 'pending',
        }),
        tags: JSON.stringify(['agent_message']),
        owner: 'agent-2',
        sourceId: 'task-1',
        createdAt: new Date('2024-01-01'),
      });

      const result = await AgentCommunication.respondToAssistance('ws-1', {
        requestId: 'req-1',
        fromAgentId: 'agent-2',
        response: 'declined',
        result: 'Too busy right now',
      });

      assert.equal(result.response, 'declined');
      assert.equal(result.status, 'declined');
      assert.equal(result.result, 'Too busy right now');
    });
  });
});
