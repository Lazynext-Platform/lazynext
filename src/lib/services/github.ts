/**
 * GitHub Service — integrates with GitHub REST API for the development loop.
 *
 * Features:
 * - Repository connection (store token in PlatformConnection)
 * - List repositories
 * - Create/list issues
 * - Create/list pull requests
 * - Create/list branches
 * - Get file contents
 * - Create commits (via the Git Data API)
 * - Merge pull requests
 *
 * The GitHub token is stored per-user in PlatformConnection.
 * Agents use the github_* tool executors to interact with GitHub.
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { SecurityService } from '@/lib/services/security';

const GITHUB_API = 'https://api.github.com';

// ── Types ──

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  private: boolean;
  default_branch: string;
  description: string | null;
  html_url: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: { login: string };
  labels: Array<{ name: string }>;
  assignee: { login: string } | null;
  html_url: string;
  created_at: string;
}

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  draft: boolean;
  merged: boolean;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  user: { login: string };
  html_url: string;
  mergeable: boolean | null;
}

// ── Token Management ──

async function getToken(userId: string): Promise<string | null> {
  const conn = await safePrisma(() =>
    prisma.platformConnection.findFirst({
      where: { userId, platform: 'github' },
    }),
  null);
  if (!conn?.accessToken) return null;
  return SecurityService.decryptTokenIfNeeded(conn.accessToken);
}

export const GitHubService = {
  /**
   * Connect a GitHub account by storing a personal access token.
   */
  async connect(userId: string, token: string): Promise<{ ok: boolean; username?: string; error?: string }> {
    // Verify the token by fetching the authenticated user
    try {
      const res = await fetch(`${GITHUB_API}/user`, {
        headers: this.headers(token),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        return { ok: false, error: `Invalid token: ${res.status}` };
      }
      const user = await res.json() as { login: string; id: number };

      // Encrypt the token before storing it at rest
      const encryptedToken = await SecurityService.encryptTokenIfPlain(token);

      // Store or update the connection
      await prisma.platformConnection.upsert({
        where: { userId_platform: { userId, platform: 'github' } },
        create: {
          userId,
          platform: 'github',
          accessToken: encryptedToken,
          platformUserId: String(user.id),
          platformUsername: user.login,
        },
        update: {
          accessToken: encryptedToken,
          platformUserId: String(user.id),
          platformUsername: user.login,
        },
      });

      return { ok: true, username: user.login };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Connection failed' };
    }
  },

  /**
   * Disconnect GitHub account.
   */
  async disconnect(userId: string): Promise<void> {
    await prisma.platformConnection.deleteMany({
      where: { userId, platform: 'github' },
    }).catch(() => {});
  },

  /**
   * Check if GitHub is connected.
   */
  async isConnected(userId: string): Promise<{ connected: boolean; username?: string }> {
    const conn = await safePrisma(() =>
      prisma.platformConnection.findFirst({
        where: { userId, platform: 'github' },
        select: { platformUsername: true },
      }),
    null);
    return {
      connected: !!conn,
      username: conn?.platformUsername || undefined,
    };
  },

  /**
   * List repositories for the authenticated user.
   */
  async listRepos(userId: string, page = 1, perPage = 30): Promise<GitHubRepo[]> {
    const token = await getToken(userId);
    if (!token) return [];

    const res = await fetch(`${GITHUB_API}/user/repos?sort=updated&per_page=${perPage}&page=${page}`, {
      headers: this.headers(token),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    return await res.json() as GitHubRepo[];
  },

  /**
   * List issues for a repository.
   */
  async listIssues(userId: string, owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<GitHubIssue[]> {
    const token = await getToken(userId);
    if (!token) return [];

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues?state=${state}&per_page=30`, {
      headers: this.headers(token),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const issues = await res.json() as GitHubIssue[];
    // Filter out PRs (GitHub returns PRs in the issues endpoint)
    return issues.filter((i) => !('pull_request' in i));
  },

  /**
   * Get a single issue by number.
   */
  async getIssue(userId: string, owner: string, repo: string, issueNumber: number): Promise<GitHubIssue | null> {
    const token = await getToken(userId);
    if (!token) return null;

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}`, {
      headers: this.headers(token),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json() as GitHubIssue;
  },

  /**
   * Create an issue.
   */
  async createIssue(userId: string, owner: string, repo: string, input: {
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }): Promise<GitHubIssue | null> {
    const token = await getToken(userId);
    if (!token) return null;

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: this.headers(token),
      body: JSON.stringify({
        title: input.title,
        body: input.body || '',
        labels: input.labels || [],
        assignees: input.assignees || [],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json() as GitHubIssue;
  },

  /**
   * List pull requests for a repository.
   */
  async listPRs(userId: string, owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<GitHubPR[]> {
    const token = await getToken(userId);
    if (!token) return [];

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls?state=${state}&per_page=30`, {
      headers: this.headers(token),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    return await res.json() as GitHubPR[];
  },

  /**
   * Create a pull request.
   */
  async createPR(userId: string, owner: string, repo: string, input: {
    title: string;
    body?: string;
    head: string; // branch name
    base: string; // target branch
    draft?: boolean;
  }): Promise<GitHubPR | null> {
    const token = await getToken(userId);
    if (!token) return null;

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: this.headers(token),
      body: JSON.stringify({
        title: input.title,
        body: input.body || '',
        head: input.head,
        base: input.base,
        draft: input.draft || false,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json() as GitHubPR;
  },

  /**
   * Get a single pull request by number.
   */
  async getPR(userId: string, owner: string, repo: string, prNumber: number): Promise<GitHubPR | null> {
    const token = await getToken(userId);
    if (!token) return null;

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`, {
      headers: this.headers(token),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json() as GitHubPR;
  },

  /**
   * Merge a pull request.
   */
  async mergePR(userId: string, owner: string, repo: string, prNumber: number, input: {
    commitTitle?: string;
    commitMessage?: string;
    method?: 'merge' | 'squash' | 'rebase';
  }): Promise<{ ok: boolean; sha?: string; error?: string }> {
    const token = await getToken(userId);
    if (!token) return { ok: false, error: 'Not connected' };

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/merge`, {
      method: 'PUT',
      headers: this.headers(token),
      body: JSON.stringify({
        commit_title: input.commitTitle,
        commit_message: input.commitMessage,
        merge_method: input.method || 'squash',
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: (err as { message?: string }).message || `Merge failed: ${res.status}` };
    }
    const data = await res.json() as { sha: string };
    return { ok: true, sha: data.sha };
  },

  /**
   * Get file contents from a repository.
   */
  async getFile(userId: string, owner: string, repo: string, path: string, ref?: string): Promise<{ content: string; sha: string } | null> {
    const token = await getToken(userId);
    if (!token) return null;

    const refParam = ref ? `?ref=${ref}` : '';
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}${refParam}`, {
      headers: this.headers(token),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { content: string; encoding: string; sha: string };
    if (data.encoding === 'base64') {
      return {
        content: Buffer.from(data.content, 'base64').toString('utf-8'),
        sha: data.sha,
      };
    }
    return { content: data.content, sha: data.sha };
  },

  /**
   * Create or update a file in a repository.
   */
  async createOrUpdateFile(userId: string, owner: string, repo: string, input: {
    path: string;
    message: string;
    content: string;
    branch: string;
    sha?: string; // required for updates
  }): Promise<{ ok: boolean; commit?: { sha: string }; error?: string }> {
    const token = await getToken(userId);
    if (!token) return { ok: false, error: 'Not connected' };

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${input.path}`, {
      method: 'PUT',
      headers: this.headers(token),
      body: JSON.stringify({
        message: input.message,
        content: Buffer.from(input.content, 'utf-8').toString('base64'),
        branch: input.branch,
        sha: input.sha,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: (err as { message?: string }).message || `Failed: ${res.status}` };
    }
    const data = await res.json() as { commit: { sha: string } };
    return { ok: true, commit: data.commit };
  },

  /**
   * Create a branch.
   */
  async createBranch(userId: string, owner: string, repo: string, branchName: string, fromBranch = 'main'): Promise<{ ok: boolean; error?: string }> {
    const token = await getToken(userId);
    if (!token) return { ok: false, error: 'Not connected' };

    // Get the SHA of the source branch
    const refRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${fromBranch}`, {
      headers: this.headers(token),
      signal: AbortSignal.timeout(10000),
    });
    if (!refRes.ok) return { ok: false, error: 'Source branch not found' };
    const refData = await refRes.json() as { object: { sha: string } };

    // Create the new branch
    const createRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: this.headers(token),
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      return { ok: false, error: (err as { message?: string }).message || 'Branch creation failed' };
    }
    return { ok: true };
  },

  /**
   * List branches.
   */
  async listBranches(userId: string, owner: string, repo: string): Promise<Array<{ name: string; protected: boolean }>> {
    const token = await getToken(userId);
    if (!token) return [];

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/branches?per_page=50`, {
      headers: this.headers(token),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    return await res.json() as Array<{ name: string; protected: boolean }>;
  },

  /**
   * Get the connection status and basic info for the Developers page.
   */
  async getStatus(userId: string): Promise<{
    connected: boolean;
    username?: string;
    repoCount?: number;
  }> {
    const { connected, username } = await this.isConnected(userId);
    if (!connected) return { connected: false };
    return { connected: true, username };
  },

  /**
   * Build standard GitHub API headers.
   */
  headers(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Lazynext/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  },
};
