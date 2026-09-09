import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

// ── Prisma mock types ──

type WorkspaceFindUniqueArgs = {
  where: { id: string };
  select: Record<string, unknown>;
};

type ProjectFindFirstArgs = {
  where: Record<string, unknown>;
  select: Record<string, unknown>;
};

type ProjectCreateArgs = {
  data: Record<string, unknown>;
};

type ProjectFindManyArgs = {
  where: Record<string, unknown>;
  select: Record<string, unknown>;
};

type TaskCreateArgs = {
  data: Record<string, unknown>;
};

type TaskUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type TaskFindUniqueArgs = {
  where: { id: string };
};

type TaskFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type AgentRunCreateArgs = {
  data: Record<string, unknown>;
};

type AgentRunFindFirstArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// ── Mutable implementation functions ──

let workspaceFindUniqueImpl: (args: WorkspaceFindUniqueArgs) => Promise<unknown> =
  async () => ({ organizationId: 'org-1' });
let projectFindFirstImpl: (args: ProjectFindFirstArgs) => Promise<unknown> =
  async () => ({ id: 'proj-1' });
let projectCreateImpl: (args: ProjectCreateArgs) => Promise<unknown> =
  async () => ({ id: 'proj-1' });
let projectFindManyImpl: (args: ProjectFindManyArgs) => Promise<unknown[]> =
  async () => [{ id: 'proj-1' }];
let taskCreateImpl: (args: TaskCreateArgs) => Promise<unknown> =
  async () => ({ id: 'task-1' });
let taskUpdateImpl: (args: TaskUpdateArgs) => Promise<unknown> =
  async () => ({});
let taskFindUniqueImpl: (args: TaskFindUniqueArgs) => Promise<unknown> =
  async () => null;
let taskFindManyImpl: (args: TaskFindManyArgs) => Promise<unknown[]> =
  async () => [];
let agentRunCreateImpl: (args: AgentRunCreateArgs) => Promise<unknown> =
  async () => ({ id: 'run-1' });
let agentRunFindFirstImpl: (args: AgentRunFindFirstArgs) => Promise<unknown> =
  async () => null;

// ── GitHubService mock ──

let githubGetIssueImpl: (userId: string, owner: string, repo: string, issueNumber: number) => Promise<unknown> =
  async () => ({
    id: 1,
    number: 42,
    title: 'Fix login bug',
    body: 'The login button does not work on mobile.',
    state: 'open',
    user: { login: 'testuser' },
    labels: [],
    assignee: null,
    html_url: 'https://github.com/test/repo/issues/42',
    created_at: '2025-01-01T00:00:00Z',
  });

let githubCreateBranchImpl: (userId: string, owner: string, repo: string, branchName: string, fromBranch?: string) => Promise<unknown> =
  async () => ({ ok: true });

let githubGetFileImpl: (userId: string, owner: string, repo: string, path: string, ref?: string) => Promise<unknown> =
  async () => null;

let githubCreateOrUpdateFileImpl: (userId: string, owner: string, repo: string, input: Record<string, unknown>) => Promise<unknown> =
  async () => ({ ok: true, commit: { sha: 'commit-sha-1' } });

let githubCreatePRImpl: (userId: string, owner: string, repo: string, input: Record<string, unknown>) => Promise<unknown> =
  async () => ({
    id: 1,
    number: 5,
    title: 'Fix login bug',
    body: 'Fixes #42',
    state: 'open',
    draft: false,
    merged: false,
    head: { ref: 'fix/issue-42-fix-login-bug', sha: 'abc' },
    base: { ref: 'main', sha: 'def' },
    user: { login: 'testuser' },
    html_url: 'https://github.com/test/repo/pull/5',
    mergeable: true,
  });

let githubGetPRImpl: (userId: string, owner: string, repo: string, prNumber: number) => Promise<unknown> =
  async () => ({
    id: 1,
    number: 5,
    title: 'Fix login bug',
    body: 'Fixes #42',
    state: 'open',
    draft: false,
    merged: false,
    head: { ref: 'fix/issue-42-fix-login-bug', sha: 'abc' },
    base: { ref: 'main', sha: 'def' },
    user: { login: 'testuser' },
    html_url: 'https://github.com/test/repo/pull/5',
    mergeable: true,
  });

let githubMergePRImpl: (userId: string, owner: string, repo: string, prNumber: number, input: Record<string, unknown>) => Promise<unknown> =
  async () => ({ ok: true, sha: 'merge-sha-1' });

// ── atlasChat mock ──

let atlasChatImpl: (messages: unknown[], model?: string, maxTokens?: number, timeoutMs?: number) => Promise<string> =
  async () => 'console.log("hello world");';

// ── Prisma mock object ──

const prismaMock = {
  workspace: {
    findUnique: (args: WorkspaceFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'workspace.findUnique', args });
      return workspaceFindUniqueImpl(args);
    },
  },
  project: {
    findFirst: (args: ProjectFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'project.findFirst', args });
      return projectFindFirstImpl(args);
    },
    create: (args: ProjectCreateArgs): Promise<unknown> => {
      calls.push({ method: 'project.create', args });
      return projectCreateImpl(args);
    },
    findMany: (args: ProjectFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'project.findMany', args });
      return projectFindManyImpl(args);
    },
  },
  task: {
    create: (args: TaskCreateArgs): Promise<unknown> => {
      calls.push({ method: 'task.create', args });
      return taskCreateImpl(args);
    },
    update: (args: TaskUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'task.update', args });
      return taskUpdateImpl(args);
    },
    findUnique: (args: TaskFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'task.findUnique', args });
      return taskFindUniqueImpl(args);
    },
    findMany: (args: TaskFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'task.findMany', args });
      return taskFindManyImpl(args);
    },
  },
  agentRun: {
    create: (args: AgentRunCreateArgs): Promise<unknown> => {
      calls.push({ method: 'agentRun.create', args });
      return agentRunCreateImpl(args);
    },
    findFirst: (args: AgentRunFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'agentRun.findFirst', args });
      return agentRunFindFirstImpl(args);
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

// ── GitHubService mock ──

mock.module('@/lib/services/github', {
  namedExports: {
    GitHubService: {
      getIssue: (userId: string, owner: string, repo: string, issueNumber: number): Promise<unknown> => {
        calls.push({ method: 'GitHubService.getIssue', args: { userId, owner, repo, issueNumber } });
        return githubGetIssueImpl(userId, owner, repo, issueNumber);
      },
      createBranch: (userId: string, owner: string, repo: string, branchName: string, fromBranch?: string): Promise<unknown> => {
        calls.push({ method: 'GitHubService.createBranch', args: { userId, owner, repo, branchName, fromBranch } });
        return githubCreateBranchImpl(userId, owner, repo, branchName, fromBranch);
      },
      getFile: (userId: string, owner: string, repo: string, path: string, ref?: string): Promise<unknown> => {
        calls.push({ method: 'GitHubService.getFile', args: { userId, owner, repo, path, ref } });
        return githubGetFileImpl(userId, owner, repo, path, ref);
      },
      createOrUpdateFile: (userId: string, owner: string, repo: string, input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'GitHubService.createOrUpdateFile', args: { userId, owner, repo, input } });
        return githubCreateOrUpdateFileImpl(userId, owner, repo, input);
      },
      createPR: (userId: string, owner: string, repo: string, input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'GitHubService.createPR', args: { userId, owner, repo, input } });
        return githubCreatePRImpl(userId, owner, repo, input);
      },
      getPR: (userId: string, owner: string, repo: string, prNumber: number): Promise<unknown> => {
        calls.push({ method: 'GitHubService.getPR', args: { userId, owner, repo, prNumber } });
        return githubGetPRImpl(userId, owner, repo, prNumber);
      },
      mergePR: (userId: string, owner: string, repo: string, prNumber: number, input: Record<string, unknown>): Promise<unknown> => {
        calls.push({ method: 'GitHubService.mergePR', args: { userId, owner, repo, prNumber, input } });
        return githubMergePRImpl(userId, owner, repo, prNumber, input);
      },
    },
  },
});

// ── atlasChat mock ──

mock.module('@/lib/atlas', {
  namedExports: {
    atlasChat: (messages: unknown[], model?: string, maxTokens?: number, timeoutMs?: number): Promise<string> => {
      calls.push({ method: 'atlasChat', args: { model, maxTokens } });
      return atlasChatImpl(messages, model, maxTokens, timeoutMs);
    },
    DEFAULT_CHAT_MODEL: 'test-model',
  },
});

// ── EventService mock ──

mock.module('@/lib/services/event', {
  namedExports: {
    EventService: {
      emit: async (input: Record<string, unknown>) => {
        calls.push({ method: 'EventService.emit', args: input });
        return { id: 'evt-1' };
      },
    },
  },
});

// ── MemoryService mock ──

mock.module('@/lib/services/memory', {
  namedExports: {
    MemoryService: {
      create: async (input: Record<string, unknown>) => {
        calls.push({ method: 'MemoryService.create', args: input });
        return { id: 'mem-1' };
      },
      assembleContext: async () => ({ memories: [], summary: '0 memories' }),
    },
  },
});

// ── Dynamic import after mocks ──

const { CodingLoopService } = await import('@/lib/services/coding-loop');

// ── Reset function ──

function resetMock(): void {
  calls.length = 0;
  workspaceFindUniqueImpl = async () => ({ organizationId: 'org-1' });
  projectFindFirstImpl = async () => ({ id: 'proj-1' });
  projectCreateImpl = async () => ({ id: 'proj-1' });
  projectFindManyImpl = async () => [{ id: 'proj-1' }];
  taskCreateImpl = async () => ({ id: 'task-1' });
  taskUpdateImpl = async () => ({});
  taskFindUniqueImpl = async () => null;
  taskFindManyImpl = async () => [];
  agentRunCreateImpl = async () => ({ id: 'run-1' });
  agentRunFindFirstImpl = async () => null;
  githubGetIssueImpl = async () => ({
    id: 1,
    number: 42,
    title: 'Fix login bug',
    body: 'The login button does not work on mobile.',
    state: 'open',
    user: { login: 'testuser' },
    labels: [],
    assignee: null,
    html_url: 'https://github.com/test/repo/issues/42',
    created_at: '2025-01-01T00:00:00Z',
  });
  githubCreateBranchImpl = async () => ({ ok: true });
  githubGetFileImpl = async () => null;
  githubCreateOrUpdateFileImpl = async () => ({ ok: true, commit: { sha: 'commit-sha-1' } });
  githubCreatePRImpl = async () => ({
    id: 1,
    number: 5,
    title: 'Fix login bug',
    body: 'Fixes #42',
    state: 'open',
    draft: false,
    merged: false,
    head: { ref: 'fix/issue-42-fix-login-bug', sha: 'abc' },
    base: { ref: 'main', sha: 'def' },
    user: { login: 'testuser' },
    html_url: 'https://github.com/test/repo/pull/5',
    mergeable: true,
  });
  githubGetPRImpl = async () => ({
    id: 1,
    number: 5,
    title: 'Fix login bug',
    body: 'Fixes #42',
    state: 'open',
    draft: false,
    merged: false,
    head: { ref: 'fix/issue-42-fix-login-bug', sha: 'abc' },
    base: { ref: 'main', sha: 'def' },
    user: { login: 'testuser' },
    html_url: 'https://github.com/test/repo/pull/5',
    mergeable: true,
  });
  githubMergePRImpl = async () => ({ ok: true, sha: 'merge-sha-1' });
  atlasChatImpl = async () => 'console.log("hello world");';
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CodingLoopService', () => {
  beforeEach(() => { resetMock(); });

  // ── startCodingLoop ──

  describe('startCodingLoop', () => {
    it('creates branch, task, and agent run from a GitHub issue', async () => {
      const result = await CodingLoopService.startCodingLoop('ws-1', 'user-1', {
        owner: 'test',
        repo: 'repo',
        issueNumber: 42,
      });

      assert.equal(result.taskId, 'task-1');
      assert.equal(result.agentRunId, 'run-1');
      assert.ok(result.branchName.startsWith('fix/issue-42-'));
      assert.equal(result.issue.number, 42);

      // Verify GitHubService.getIssue was called
      const getIssueCalls = calls.filter((c) => c.method === 'GitHubService.getIssue');
      assert.equal(getIssueCalls.length, 1);

      // Verify GitHubService.createBranch was called
      const createBranchCalls = calls.filter((c) => c.method === 'GitHubService.createBranch');
      assert.equal(createBranchCalls.length, 1);

      // Verify task.create was called
      const taskCreateCalls = calls.filter((c) => c.method === 'task.create');
      assert.equal(taskCreateCalls.length, 1);

      // Verify agentRun.create was called
      const agentRunCreateCalls = calls.filter((c) => c.method === 'agentRun.create');
      assert.equal(agentRunCreateCalls.length, 1);
    });

    it('throws when issue is not found', async () => {
      githubGetIssueImpl = async () => null;

      await assert.rejects(
        CodingLoopService.startCodingLoop('ws-1', 'user-1', {
          owner: 'test',
          repo: 'repo',
          issueNumber: 999,
        }),
        /Issue #999 not found/,
      );
    });

    it('throws when branch creation fails', async () => {
      githubCreateBranchImpl = async () => ({ ok: false, error: 'Branch exists' });

      await assert.rejects(
        CodingLoopService.startCodingLoop('ws-1', 'user-1', {
          owner: 'test',
          repo: 'repo',
          issueNumber: 42,
        }),
        /Failed to create branch/,
      );
    });

    it('records a memory and emits an event', async () => {
      await CodingLoopService.startCodingLoop('ws-1', 'user-1', {
        owner: 'test',
        repo: 'repo',
        issueNumber: 42,
      });

      const memoryCalls = calls.filter((c) => c.method === 'MemoryService.create');
      assert.equal(memoryCalls.length, 1);
      const memArgs = memoryCalls[0].args as Record<string, unknown>;
      assert.equal(memArgs.type, 'active_context');
      assert.ok(String(memArgs.content).includes('Coding loop started'));

      const eventCalls = calls.filter((c) => c.method === 'EventService.emit');
      assert.equal(eventCalls.length, 1);
      const evtArgs = eventCalls[0].args as Record<string, unknown>;
      assert.equal(evtArgs.type, 'coding_loop.started');
    });

    it('stores coding loop metadata in task inputs', async () => {
      let capturedTaskData: Record<string, unknown> = {};
      taskCreateImpl = async (args: TaskCreateArgs) => {
        capturedTaskData = args.data;
        return { id: 'task-1', ...args.data };
      };

      await CodingLoopService.startCodingLoop('ws-1', 'user-1', {
        owner: 'test',
        repo: 'repo',
        issueNumber: 42,
        agentId: 'agent-1',
      });

      const inputs = JSON.parse(capturedTaskData.inputs as string);
      assert.equal(inputs.codingLoop, true);
      assert.equal(inputs.owner, 'test');
      assert.equal(inputs.repo, 'repo');
      assert.equal(inputs.issueNumber, 42);
      assert.ok(inputs.branchName);
      assert.equal(capturedTaskData.assignedAgentId, 'agent-1');
    });
  });

  // ── generateCode ──

  describe('generateCode', () => {
    it('reads existing file, generates code, and writes file', async () => {
      const result = await CodingLoopService.generateCode('ws-1', 'user-1', {
        owner: 'test',
        repo: 'repo',
        branch: 'fix/issue-42',
        filePath: 'src/index.ts',
        issueContext: 'Fix the login bug',
      });

      assert.equal(result.commitSha, 'commit-sha-1');
      assert.equal(result.filePath, 'src/index.ts');
      assert.ok(result.generatedContent.length > 0);

      // Verify GitHubService.getFile was called
      const getFileCalls = calls.filter((c) => c.method === 'GitHubService.getFile');
      assert.equal(getFileCalls.length, 1);

      // Verify atlasChat was called
      const chatCalls = calls.filter((c) => c.method === 'atlasChat');
      assert.equal(chatCalls.length, 1);

      // Verify GitHubService.createOrUpdateFile was called
      const updateFileCalls = calls.filter((c) => c.method === 'GitHubService.createOrUpdateFile');
      assert.equal(updateFileCalls.length, 1);
    });

    it('passes existing file sha when updating', async () => {
      githubGetFileImpl = async () => ({ content: 'old code', sha: 'file-sha-1' });
      let capturedInput: Record<string, unknown> = {};
      githubCreateOrUpdateFileImpl = async (_u: string, _o: string, _r: string, input: Record<string, unknown>) => {
        capturedInput = input;
        return { ok: true, commit: { sha: 'commit-sha-2' } };
      };

      await CodingLoopService.generateCode('ws-1', 'user-1', {
        owner: 'test',
        repo: 'repo',
        branch: 'fix/issue-42',
        filePath: 'src/index.ts',
        issueContext: 'Fix the login bug',
      });

      assert.equal(capturedInput.sha, 'file-sha-1');
    });

    it('throws when code generation (atlasChat) fails', async () => {
      atlasChatImpl = async () => { throw new Error('LLM unavailable'); };

      await assert.rejects(
        CodingLoopService.generateCode('ws-1', 'user-1', {
          owner: 'test',
          repo: 'repo',
          branch: 'fix/issue-42',
          filePath: 'src/index.ts',
          issueContext: 'Fix the login bug',
        }),
        /Code generation failed/,
      );
    });

    it('records a memory about the generated code', async () => {
      await CodingLoopService.generateCode('ws-1', 'user-1', {
        owner: 'test',
        repo: 'repo',
        branch: 'fix/issue-42',
        filePath: 'src/index.ts',
        issueContext: 'Fix the login bug',
      });

      const memoryCalls = calls.filter((c) => c.method === 'MemoryService.create');
      assert.equal(memoryCalls.length, 1);
      const memArgs = memoryCalls[0].args as Record<string, unknown>;
      assert.equal(memArgs.type, 'outcome');
      assert.ok(String(memArgs.content).includes('Generated code'));
    });
  });

  // ── createPullRequest ──

  describe('createPullRequest', () => {
    it('creates a PR and updates task status', async () => {
      const result = await CodingLoopService.createPullRequest('ws-1', 'user-1', {
        owner: 'test',
        repo: 'repo',
        branch: 'fix/issue-42',
        base: 'main',
        title: 'Fix login bug',
        body: 'Fixes #42',
        issueNumber: 42,
        taskId: 'task-1',
      });

      assert.equal(result.number, 5);
      assert.equal(result.state, 'open');

      // Verify GitHubService.createPR was called
      const createPRCalls = calls.filter((c) => c.method === 'GitHubService.createPR');
      assert.equal(createPRCalls.length, 1);

      // Verify task.update was called
      const taskUpdateCalls = calls.filter((c) => c.method === 'task.update');
      assert.equal(taskUpdateCalls.length, 1);
      const updateArgs = taskUpdateCalls[0].args as TaskUpdateArgs;
      assert.equal(updateArgs.where.id, 'task-1');
      assert.equal(updateArgs.data.status, 'in_progress');
    });

    it('throws when PR creation fails', async () => {
      githubCreatePRImpl = async () => null;

      await assert.rejects(
        CodingLoopService.createPullRequest('ws-1', 'user-1', {
          owner: 'test',
          repo: 'repo',
          branch: 'fix/issue-42',
          base: 'main',
          title: 'Fix login bug',
          body: 'Fixes #42',
          issueNumber: 42,
        }),
        /Failed to create pull request/,
      );
    });

    it('emits an event and records a memory', async () => {
      await CodingLoopService.createPullRequest('ws-1', 'user-1', {
        owner: 'test',
        repo: 'repo',
        branch: 'fix/issue-42',
        base: 'main',
        title: 'Fix login bug',
        body: 'Fixes #42',
        issueNumber: 42,
      });

      const eventCalls = calls.filter((c) => c.method === 'EventService.emit');
      assert.equal(eventCalls.length, 1);
      const evtArgs = eventCalls[0].args as Record<string, unknown>;
      assert.equal(evtArgs.type, 'coding_loop.pr_created');

      const memoryCalls = calls.filter((c) => c.method === 'MemoryService.create');
      assert.equal(memoryCalls.length, 1);
    });
  });

  // ── verifyAndMerge ──

  describe('verifyAndMerge', () => {
    it('merges a mergeable PR and updates task to done', async () => {
      const result = await CodingLoopService.verifyAndMerge('ws-1', 'user-1', {
        owner: 'test',
        repo: 'repo',
        prNumber: 5,
        taskId: 'task-1',
      });

      assert.equal(result.merged, true);
      assert.equal(result.sha, 'merge-sha-1');

      // Verify GitHubService.getPR was called
      const getPRCalls = calls.filter((c) => c.method === 'GitHubService.getPR');
      assert.equal(getPRCalls.length, 1);

      // Verify GitHubService.mergePR was called
      const mergePRCalls = calls.filter((c) => c.method === 'GitHubService.mergePR');
      assert.equal(mergePRCalls.length, 1);

      // Verify task.update was called with status done
      const taskUpdateCalls = calls.filter((c) => c.method === 'task.update');
      assert.equal(taskUpdateCalls.length, 1);
      const updateArgs = taskUpdateCalls[0].args as TaskUpdateArgs;
      assert.equal(updateArgs.data.status, 'done');
    });

    it('returns error when PR is not found', async () => {
      githubGetPRImpl = async () => null;

      const result = await CodingLoopService.verifyAndMerge('ws-1', 'user-1', {
        owner: 'test',
        repo: 'repo',
        prNumber: 999,
      });

      assert.equal(result.merged, false);
      assert.equal(result.error, 'Pull request not found');
    });

    it('returns error when PR is already merged', async () => {
      githubGetPRImpl = async () => ({
        number: 5,
        state: 'closed',
        merged: true,
        mergeable: null,
      });

      const result = await CodingLoopService.verifyAndMerge('ws-1', 'user-1', {
        owner: 'test',
        repo: 'repo',
        prNumber: 5,
      });

      assert.equal(result.merged, false);
      assert.equal(result.error, 'PR is already merged');
    });

    it('returns error when PR has merge conflicts', async () => {
      githubGetPRImpl = async () => ({
        number: 5,
        state: 'open',
        merged: false,
        mergeable: false,
      });

      const result = await CodingLoopService.verifyAndMerge('ws-1', 'user-1', {
        owner: 'test',
        repo: 'repo',
        prNumber: 5,
      });

      assert.equal(result.merged, false);
      assert.equal(result.error, 'PR has merge conflicts');
    });

    it('emits a merge event and records a memory', async () => {
      await CodingLoopService.verifyAndMerge('ws-1', 'user-1', {
        owner: 'test',
        repo: 'repo',
        prNumber: 5,
      });

      const eventCalls = calls.filter((c) => c.method === 'EventService.emit');
      assert.equal(eventCalls.length, 1);
      const evtArgs = eventCalls[0].args as Record<string, unknown>;
      assert.equal(evtArgs.type, 'coding_loop.merged');

      const memoryCalls = calls.filter((c) => c.method === 'MemoryService.create');
      assert.equal(memoryCalls.length, 1);
      const memArgs = memoryCalls[0].args as Record<string, unknown>;
      assert.equal(memArgs.type, 'outcome');
    });
  });

  // ── getLoopStatus ──

  describe('getLoopStatus', () => {
    it('returns task, agentRun, branchName, and prNumber', async () => {
      taskFindUniqueImpl = async () => ({
        id: 'task-1',
        status: 'in_progress',
        inputs: JSON.stringify({
          codingLoop: true,
          branchName: 'fix/issue-42-fix-login-bug',
          owner: 'test',
          repo: 'repo',
          issueNumber: 42,
        }),
        outputs: JSON.stringify({
          prNumber: 5,
          prUrl: 'https://github.com/test/repo/pull/5',
        }),
      });
      agentRunFindFirstImpl = async () => ({
        id: 'run-1',
        status: 'running',
      });

      const result = await CodingLoopService.getLoopStatus('ws-1', 'task-1');

      assert.ok(result.task);
      assert.equal(result.status, 'in_progress');
      assert.equal(result.branchName, 'fix/issue-42-fix-login-bug');
      assert.equal(result.prNumber, 5);
      assert.ok(result.agentRun);
      assert.equal(result.agentRun.id, 'run-1');
    });

    it('returns not_found status when task does not exist', async () => {
      taskFindUniqueImpl = async () => null;

      const result = await CodingLoopService.getLoopStatus('ws-1', 'nonexistent');

      assert.equal(result.task, null);
      assert.equal(result.status, 'not_found');
      assert.equal(result.branchName, null);
      assert.equal(result.prNumber, null);
    });
  });

  // ── listLoops ──

  describe('listLoops', () => {
    it('returns coding loop tasks with parsed metadata', async () => {
      projectFindManyImpl = async () => [{ id: 'proj-1' }];
      taskFindManyImpl = async () => [
        {
          id: 'task-1',
          title: 'Fix #42: Fix login bug',
          status: 'in_progress',
          inputs: JSON.stringify({
            codingLoop: true,
            owner: 'test',
            repo: 'repo',
            issueNumber: 42,
            branchName: 'fix/issue-42-fix-login-bug',
            issueTitle: 'Fix login bug',
          }),
          outputs: JSON.stringify({ prNumber: 5 }),
          createdAt: '2025-01-01T00:00:00Z',
        },
      ];

      const result = await CodingLoopService.listLoops('ws-1');

      assert.equal(result.length, 1);
      const loop = result[0] as Record<string, unknown>;
      assert.equal(loop.branchName, 'fix/issue-42-fix-login-bug');
      assert.equal(loop.owner, 'test');
      assert.equal(loop.repo, 'repo');
      assert.equal(loop.issueNumber, 42);
      assert.equal(loop.issueTitle, 'Fix login bug');
      assert.equal(loop.prNumber, 5);
    });

    it('returns empty array when no projects exist', async () => {
      projectFindManyImpl = async () => [];

      const result = await CodingLoopService.listLoops('ws-1');

      assert.deepEqual(result, []);
    });

    it('returns empty array when no coding loop tasks exist', async () => {
      projectFindManyImpl = async () => [{ id: 'proj-1' }];
      taskFindManyImpl = async () => [];

      const result = await CodingLoopService.listLoops('ws-1');

      assert.deepEqual(result, []);
    });
  });
});
