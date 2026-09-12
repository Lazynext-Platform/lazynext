import type { IntegrationClient, IntegrationConfig, IntegrationResult } from './index';

const GITHUB_API = 'https://api.github.com';

export class GitHubClient implements IntegrationClient {
  name = 'github';
  type = 'version-control';
  private config: IntegrationConfig | null = null;

  configure(config: IntegrationConfig): void {
    this.config = config;
  }

  private getToken(): string | null {
    return this.config?.credentials.token || process.env.GITHUB_TOKEN || null;
  }

  private headers(): Record<string, string> {
    const token = this.getToken();
    const h: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  async testConnection(): Promise<IntegrationResult> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'GitHub token not configured (set GITHUB_TOKEN or provide credentials.token)' };
    }
    try {
      const resp = await fetch(`${GITHUB_API}/user`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) {
        return { success: false, error: `GitHub API returned ${resp.status}` };
      }
      const user = await resp.json() as { login?: string; name?: string };
      return { success: true, data: { message: `Connected as ${user.login}`, username: user.login, name: user.name } };
    } catch (e) {
      return { success: false, error: `GitHub connection failed: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }

  async listRepos(): Promise<IntegrationResult> {
    if (!this.config) return { success: false, error: 'Not configured' };
    try {
      const resp = await fetch(`${GITHUB_API}/user/repos?per_page=100&sort=updated`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) {
        return { success: false, error: `GitHub API returned ${resp.status}` };
      }
      const repos = await resp.json() as Array<{ id: number; name: string; full_name: string; private: boolean; html_url: string; updated_at: string }>;
      return { success: true, data: { repos: repos.map(r => ({ id: r.id, name: r.name, full_name: r.full_name, private: r.private, html_url: r.html_url, updated_at: r.updated_at })) } };
    } catch (e) {
      return { success: false, error: `GitHub listRepos failed: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }

  async createIssue(repo: string, title: string, body: string): Promise<IntegrationResult> {
    if (!this.config) return { success: false, error: 'Not configured' };
    try {
      const resp = await fetch(`${GITHUB_API}/repos/${repo}/issues`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ title, body }),
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) {
        const err = await resp.text().catch(() => '');
        return { success: false, error: `GitHub API returned ${resp.status}: ${err.slice(0, 200)}` };
      }
      const issue = await resp.json() as { number: number; html_url: string };
      return { success: true, data: { repo, title, body, number: issue.number, html_url: issue.html_url } };
    } catch (e) {
      return { success: false, error: `GitHub createIssue failed: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }

  async createPR(repo: string, title: string, head: string, base: string): Promise<IntegrationResult> {
    if (!this.config) return { success: false, error: 'Not configured' };
    try {
      const resp = await fetch(`${GITHUB_API}/repos/${repo}/pulls`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ title, head, base }),
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) {
        const err = await resp.text().catch(() => '');
        return { success: false, error: `GitHub API returned ${resp.status}: ${err.slice(0, 200)}` };
      }
      const pr = await resp.json() as { number: number; html_url: string };
      return { success: true, data: { repo, title, head, base, number: pr.number, html_url: pr.html_url } };
    } catch (e) {
      return { success: false, error: `GitHub createPR failed: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }

  async getWorkflowRuns(repo: string): Promise<IntegrationResult> {
    if (!this.config) return { success: false, error: 'Not configured' };
    try {
      const resp = await fetch(`${GITHUB_API}/repos/${repo}/actions/runs?per_page=20`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) {
        return { success: false, error: `GitHub API returned ${resp.status}` };
      }
      const data = await resp.json() as { workflow_runs?: Array<{ id: number; name: string; status: string; conclusion: string | null; created_at: string; html_url: string }> };
      return { success: true, data: { repo, runs: data.workflow_runs?.map(r => ({ id: r.id, name: r.name, status: r.status, conclusion: r.conclusion, created_at: r.created_at, html_url: r.html_url })) || [] } };
    } catch (e) {
      return { success: false, error: `GitHub getWorkflowRuns failed: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }
}

export const githubClient = new GitHubClient();
