import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock types
// ─────────────────────────────────────────────────────────────────────────────

type PlatformConnectionFindFirstArgs = {
  where: { userId: string; platform: string };
  select?: Record<string, unknown>;
};

type PlatformConnectionUpsertArgs = {
  where: { userId_platform: { userId: string; platform: string } };
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};

type PlatformConnectionDeleteManyArgs = {
  where: { userId: string; platform: string };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// ── Prisma mock ──

let findFirstImpl: (args: PlatformConnectionFindFirstArgs) => Promise<unknown> =
  async () => null;
let upsertImpl: (args: PlatformConnectionUpsertArgs) => Promise<unknown> =
  async () => ({});
let deleteManyImpl: (args: PlatformConnectionDeleteManyArgs) => Promise<unknown> =
  async () => ({ count: 0 });

const prismaMock = {
  platformConnection: {
    findFirst: (args: PlatformConnectionFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'platformConnection.findFirst', args });
      return findFirstImpl(args);
    },
    upsert: (args: PlatformConnectionUpsertArgs): Promise<unknown> => {
      calls.push({ method: 'platformConnection.upsert', args });
      return upsertImpl(args);
    },
    deleteMany: (args: PlatformConnectionDeleteManyArgs): Promise<unknown> => {
      calls.push({ method: 'platformConnection.deleteMany', args });
      return deleteManyImpl(args);
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

// ── SecurityService mock — pass-through for token encryption/decryption ──

const securityMock = {
  encryptTokenIfPlain: async (token: string): Promise<string> => token,
  decryptTokenIfNeeded: async (token: string): Promise<string> => token,
};

mock.module('@/lib/services/security', {
  namedExports: { SecurityService: securityMock },
});

// ── fetch mock ──

interface FetchCall {
  url: string;
  options?: RequestInit;
}

const fetchMock = {
  calls: [] as FetchCall[],
  implementation: null as ((url: string, options?: RequestInit) => Promise<Response>) | null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const originalFetch = globalThis.fetch;

function resetMock(): void {
  calls.length = 0;
  fetchMock.calls.length = 0;
  fetchMock.implementation = null;
  findFirstImpl = async () => null;
  upsertImpl = async () => ({});
  deleteManyImpl = async () => ({ count: 0 });
  globalThis.fetch = originalFetch;
}

const { GitHubService } = await import('@/lib/services/github');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('GitHubService', () => {
  beforeEach(() => {
    resetMock();
  });

  // ── headers ──

  describe('headers', () => {
    it('returns correct headers', () => {
      const headers = GitHubService.headers('token-123');
      assert.equal(headers.Authorization, 'Bearer token-123');
      assert.equal(headers.Accept, 'application/vnd.github.v3+json');
      assert.equal(headers['User-Agent'], 'Lazynext/1.0');
      assert.equal(headers['X-GitHub-Api-Version'], '2022-11-28');
    });
  });

  // ── connect ──

  describe('connect', () => {
    it('succeeds when token is valid and upserts connection', async () => {
      fetchMock.implementation = async (url: string) => {
        fetchMock.calls.push({ url });
        if (url.endsWith('/user')) {
          return jsonResponse({ login: 'octocat', id: 1 });
        }
        return jsonResponse({}, 404);
      };
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return fetchMock.implementation!(url, options);
      }) as typeof fetch;

      const result = await GitHubService.connect('user-1', 'token-123');

      assert.equal(result.ok, true);
      assert.equal(result.username, 'octocat');
      const upsertCalls = calls.filter((c) => c.method === 'platformConnection.upsert');
      assert.equal(upsertCalls.length, 1);
      const args = upsertCalls[0].args as PlatformConnectionUpsertArgs;
      assert.equal(args.where.userId_platform.userId, 'user-1');
      assert.equal(args.where.userId_platform.platform, 'github');
      assert.equal((args.create as { accessToken: string }).accessToken, 'token-123');
    });

    it('fails when token is invalid (401)', async () => {
      fetchMock.implementation = async (url: string) => {
        fetchMock.calls.push({ url });
        return jsonResponse({ message: 'Bad credentials' }, 401);
      };
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return fetchMock.implementation!(url, options);
      }) as typeof fetch;

      const result = await GitHubService.connect('user-1', 'bad-token');

      assert.equal(result.ok, false);
      assert.ok(result.error?.includes('401'));
      const upsertCalls = calls.filter((c) => c.method === 'platformConnection.upsert');
      assert.equal(upsertCalls.length, 0);
    });
  });

  // ── disconnect ──

  describe('disconnect', () => {
    it('deletes the connection', async () => {
      await GitHubService.disconnect('user-1');

      const deleteCalls = calls.filter((c) => c.method === 'platformConnection.deleteMany');
      assert.equal(deleteCalls.length, 1);
      const args = deleteCalls[0].args as PlatformConnectionDeleteManyArgs;
      assert.equal(args.where.userId, 'user-1');
      assert.equal(args.where.platform, 'github');
    });
  });

  // ── isConnected ──

  describe('isConnected', () => {
    it('returns true when connection exists', async () => {
      findFirstImpl = async () => ({ platformUsername: 'octocat' });

      const result = await GitHubService.isConnected('user-1');

      assert.equal(result.connected, true);
      assert.equal(result.username, 'octocat');
    });

    it('returns false when no connection', async () => {
      findFirstImpl = async () => null;

      const result = await GitHubService.isConnected('user-1');

      assert.equal(result.connected, false);
      assert.equal(result.username, undefined);
    });
  });

  // ── listRepos ──

  describe('listRepos', () => {
    it('returns repos when connected', async () => {
      findFirstImpl = async () => ({ accessToken: 'token-123' });
      fetchMock.implementation = async (url: string) => {
        fetchMock.calls.push({ url });
        if (url.includes('/user/repos')) {
          return jsonResponse([
            { id: 1, name: 'repo1', full_name: 'octocat/repo1', owner: { login: 'octocat' }, private: false, default_branch: 'main', description: null, html_url: 'https://github.com/octocat/repo1' },
          ]);
        }
        return jsonResponse({}, 404);
      };
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return fetchMock.implementation!(url, options);
      }) as typeof fetch;

      const repos = await GitHubService.listRepos('user-1');

      assert.equal(repos.length, 1);
      assert.equal(repos[0].name, 'repo1');
    });

    it('returns empty when not connected', async () => {
      findFirstImpl = async () => null;

      const repos = await GitHubService.listRepos('user-1');

      assert.deepEqual(repos, []);
      assert.equal(fetchMock.calls.length, 0);
    });
  });

  // ── listIssues ──

  describe('listIssues', () => {
    it('returns issues and filters out PRs', async () => {
      findFirstImpl = async () => ({ accessToken: 'token-123' });
      fetchMock.implementation = async (url: string) => {
        fetchMock.calls.push({ url });
        if (url.includes('/issues')) {
          return jsonResponse([
            { id: 1, number: 1, title: 'Issue 1', body: null, state: 'open', user: { login: 'octocat' }, labels: [], assignee: null, html_url: 'u1', created_at: 't1' },
            { id: 2, number: 2, title: 'PR 1', body: null, state: 'open', user: { login: 'octocat' }, labels: [], assignee: null, html_url: 'u2', created_at: 't2', pull_request: { url: 'pr-url' } },
            { id: 3, number: 3, title: 'Issue 2', body: null, state: 'open', user: { login: 'octocat' }, labels: [], assignee: null, html_url: 'u3', created_at: 't3' },
          ]);
        }
        return jsonResponse({}, 404);
      };
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return fetchMock.implementation!(url, options);
      }) as typeof fetch;

      const issues = await GitHubService.listIssues('user-1', 'octocat', 'repo1');

      assert.equal(issues.length, 2);
      assert.equal(issues[0].title, 'Issue 1');
      assert.equal(issues[1].title, 'Issue 2');
    });
  });

  // ── createIssue ──

  describe('createIssue', () => {
    it('creates an issue', async () => {
      findFirstImpl = async () => ({ accessToken: 'token-123' });
      fetchMock.implementation = async (url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        if (url.includes('/issues') && options?.method === 'POST') {
          return jsonResponse({ id: 10, number: 10, title: 'New Issue', body: 'body', state: 'open', user: { login: 'octocat' }, labels: [], assignee: null, html_url: 'u10', created_at: 't10' });
        }
        return jsonResponse({}, 404);
      };
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return fetchMock.implementation!(url, options);
      }) as typeof fetch;

      const issue = await GitHubService.createIssue('user-1', 'octocat', 'repo1', {
        title: 'New Issue',
        body: 'body',
      });

      assert.ok(issue);
      assert.equal(issue.number, 10);
      assert.equal(issue.title, 'New Issue');
    });
  });

  // ── listPRs ──

  describe('listPRs', () => {
    it('returns pull requests', async () => {
      findFirstImpl = async () => ({ accessToken: 'token-123' });
      fetchMock.implementation = async (url: string) => {
        fetchMock.calls.push({ url });
        if (url.includes('/pulls')) {
          return jsonResponse([
            { id: 1, number: 1, title: 'PR 1', body: null, state: 'open', draft: false, merged: false, head: { ref: 'feature', sha: 'abc' }, base: { ref: 'main', sha: 'def' }, user: { login: 'octocat' }, html_url: 'pr1', mergeable: true },
          ]);
        }
        return jsonResponse({}, 404);
      };
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return fetchMock.implementation!(url, options);
      }) as typeof fetch;

      const prs = await GitHubService.listPRs('user-1', 'octocat', 'repo1');

      assert.equal(prs.length, 1);
      assert.equal(prs[0].title, 'PR 1');
      assert.equal(prs[0].head.ref, 'feature');
    });
  });

  // ── createPR ──

  describe('createPR', () => {
    it('creates a pull request', async () => {
      findFirstImpl = async () => ({ accessToken: 'token-123' });
      fetchMock.implementation = async (url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        if (url.includes('/pulls') && options?.method === 'POST') {
          return jsonResponse({ id: 5, number: 5, title: 'New PR', body: 'body', state: 'open', draft: false, merged: false, head: { ref: 'feature', sha: 'abc' }, base: { ref: 'main', sha: 'def' }, user: { login: 'octocat' }, html_url: 'pr5', mergeable: null });
        }
        return jsonResponse({}, 404);
      };
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return fetchMock.implementation!(url, options);
      }) as typeof fetch;

      const pr = await GitHubService.createPR('user-1', 'octocat', 'repo1', {
        title: 'New PR',
        head: 'feature',
        base: 'main',
      });

      assert.ok(pr);
      assert.equal(pr.number, 5);
      assert.equal(pr.title, 'New PR');
    });
  });

  // ── mergePR ──

  describe('mergePR', () => {
    it('succeeds and returns sha', async () => {
      findFirstImpl = async () => ({ accessToken: 'token-123' });
      fetchMock.implementation = async (url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        if (url.includes('/merge') && options?.method === 'PUT') {
          return jsonResponse({ sha: 'mergesha123' });
        }
        return jsonResponse({}, 404);
      };
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return fetchMock.implementation!(url, options);
      }) as typeof fetch;

      const result = await GitHubService.mergePR('user-1', 'octocat', 'repo1', 5, {});

      assert.equal(result.ok, true);
      assert.equal(result.sha, 'mergesha123');
    });

    it('fails when merge is not possible', async () => {
      findFirstImpl = async () => ({ accessToken: 'token-123' });
      fetchMock.implementation = async (url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        if (url.includes('/merge') && options?.method === 'PUT') {
          return jsonResponse({ message: 'Pull Request is not mergeable' }, 405);
        }
        return jsonResponse({}, 404);
      };
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return fetchMock.implementation!(url, options);
      }) as typeof fetch;

      const result = await GitHubService.mergePR('user-1', 'octocat', 'repo1', 5, {});

      assert.equal(result.ok, false);
      assert.ok(result.error?.includes('not mergeable'));
    });
  });

  // ── getFile ──

  describe('getFile', () => {
    it('returns decoded base64 content', async () => {
      findFirstImpl = async () => ({ accessToken: 'token-123' });
      const fileContent = Buffer.from('hello world', 'utf-8').toString('base64');
      fetchMock.implementation = async (url: string) => {
        fetchMock.calls.push({ url });
        if (url.includes('/contents/')) {
          return jsonResponse({ content: fileContent, encoding: 'base64', sha: 'filesha123' });
        }
        return jsonResponse({}, 404);
      };
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return fetchMock.implementation!(url, options);
      }) as typeof fetch;

      const file = await GitHubService.getFile('user-1', 'octocat', 'repo1', 'README.md');

      assert.ok(file);
      assert.equal(file.content, 'hello world');
      assert.equal(file.sha, 'filesha123');
    });
  });

  // ── createOrUpdateFile ──

  describe('createOrUpdateFile', () => {
    it('succeeds and returns commit', async () => {
      findFirstImpl = async () => ({ accessToken: 'token-123' });
      fetchMock.implementation = async (url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        if (url.includes('/contents/') && options?.method === 'PUT') {
          return jsonResponse({ commit: { sha: 'commitsha123' } });
        }
        return jsonResponse({}, 404);
      };
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return fetchMock.implementation!(url, options);
      }) as typeof fetch;

      const result = await GitHubService.createOrUpdateFile('user-1', 'octocat', 'repo1', {
        path: 'README.md',
        message: 'update readme',
        content: 'new content',
        branch: 'main',
      });

      assert.equal(result.ok, true);
      assert.ok(result.commit);
      assert.equal(result.commit!.sha, 'commitsha123');
    });
  });

  // ── createBranch ──

  describe('createBranch', () => {
    it('succeeds when source branch exists', async () => {
      findFirstImpl = async () => ({ accessToken: 'token-123' });
      fetchMock.implementation = async (url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        if (url.includes('/git/refs/heads/') && options?.method !== 'POST') {
          return jsonResponse({ object: { sha: 'sourcesha123' } });
        }
        if (url.endsWith('/git/refs') && options?.method === 'POST') {
          return jsonResponse({ ref: 'refs/heads/new-branch', object: { sha: 'sourcesha123' } }, 201);
        }
        return jsonResponse({}, 404);
      };
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return fetchMock.implementation!(url, options);
      }) as typeof fetch;

      const result = await GitHubService.createBranch('user-1', 'octocat', 'repo1', 'new-branch', 'main');

      assert.equal(result.ok, true);
    });
  });

  // ── listBranches ──

  describe('listBranches', () => {
    it('returns branches', async () => {
      findFirstImpl = async () => ({ accessToken: 'token-123' });
      fetchMock.implementation = async (url: string) => {
        fetchMock.calls.push({ url });
        if (url.includes('/branches')) {
          return jsonResponse([
            { name: 'main', protected: true },
            { name: 'dev', protected: false },
          ]);
        }
        return jsonResponse({}, 404);
      };
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return fetchMock.implementation!(url, options);
      }) as typeof fetch;

      const branches = await GitHubService.listBranches('user-1', 'octocat', 'repo1');

      assert.equal(branches.length, 2);
      assert.equal(branches[0].name, 'main');
      assert.equal(branches[0].protected, true);
      assert.equal(branches[1].name, 'dev');
    });
  });

  // ── getStatus ──

  describe('getStatus', () => {
    it('returns connected status with username', async () => {
      findFirstImpl = async () => ({ platformUsername: 'octocat' });

      const status = await GitHubService.getStatus('user-1');

      assert.equal(status.connected, true);
      assert.equal(status.username, 'octocat');
    });

    it('returns not connected status', async () => {
      findFirstImpl = async () => null;

      const status = await GitHubService.getStatus('user-1');

      assert.equal(status.connected, false);
      assert.equal(status.username, undefined);
    });
  });
});
