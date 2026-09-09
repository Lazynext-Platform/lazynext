'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, GitPullRequest, AlertCircle, CheckCircle, GitBranch } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import type { GitHubRepo, GitHubIssue, GitHubPR } from '@/lib/services/github';

interface RepoListProps {
  repos: GitHubRepo[];
}

export function RepoList({ repos }: RepoListProps) {
  const [selected, setSelected] = useState<string>('');
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [prs, setPRs] = useState<GitHubPR[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async (owner: string, repo: string) => {
    setLoading(true);
    setError(null);
    try {
      const [issuesRes, prsRes] = await Promise.all([
        fetch(`/api/github/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&state=open`),
        fetch(`/api/github/prs?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&state=open`),
      ]);
      const issuesData = await issuesRes.json().catch(() => ({}));
      const prsData = await prsRes.json().catch(() => ({}));
      setIssues(Array.isArray(issuesData.issues) ? issuesData.issues : []);
      setPRs(Array.isArray(prsData.prs) ? prsData.prs : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load issues/PRs');
      setIssues([]);
      setPRs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    const [owner, repo] = selected.split('/');
    if (owner && repo) {
      fetchDetails(owner, repo);
    }
  }, [selected, fetchDetails]);

  if (repos.length === 0) {
    return <p className="text-sm text-fg-secondary">No repositories found.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Repo selector */}
      <div>
        <label className="block text-xs font-medium text-fg-secondary mb-1">Select repository</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full max-w-md rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
          style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
        >
          <option value="">Choose a repo…</option>
          {repos.map((r) => (
            <option key={r.id} value={r.full_name}>
              {r.full_name}
            </option>
          ))}
        </select>
      </div>

      {!selected && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <Card key={repo.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{repo.name}</div>
                  <p className="text-xs text-fg-secondary mt-0.5 line-clamp-2">
                    {repo.description || 'No description'}
                  </p>
                </div>
                <Badge variant={repo.private ? 'warning' : 'success'} className="text-xs shrink-0">
                  {repo.private ? 'private' : 'public'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <>
          {loading && <p className="text-sm text-fg-secondary">Loading issues and PRs…</p>}
          {error && <p className="text-xs text-danger">{error}</p>}

          {!loading && !error && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Issues */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Open Issues
                  </h3>
                  <span className="text-xs text-fg-secondary">{issues.length}</span>
                </div>
                {issues.length === 0 ? (
                  <p className="text-sm text-fg-secondary">No open issues.</p>
                ) : (
                  <div className="space-y-3">
                    {issues.slice(0, 10).map((issue) => (
                      <div key={issue.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-medium">#{issue.number}</span>{' '}
                          <span className="text-sm">{issue.title}</span>
                          {issue.labels.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {issue.labels.slice(0, 3).map((l) => (
                                <Badge key={l.name} variant="default" className="text-xs">
                                  {l.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <a
                          href={issue.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-fg-secondary hover:text-fg shrink-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* PRs */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <GitPullRequest className="h-4 w-4" /> Open Pull Requests
                  </h3>
                  <span className="text-xs text-fg-secondary">{prs.length}</span>
                </div>
                {prs.length === 0 ? (
                  <p className="text-sm text-fg-secondary">No open pull requests.</p>
                ) : (
                  <div className="space-y-3">
                    {prs.slice(0, 10).map((pr) => (
                      <div key={pr.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-medium">#{pr.number}</span>{' '}
                          <span className="text-sm">{pr.title}</span>
                          <div className="mt-1 flex items-center gap-2 text-xs text-fg-secondary">
                            <GitBranch className="h-3 w-3" />
                            <span>{pr.head.ref} → {pr.base.ref}</span>
                            {pr.draft && <Badge variant="default" className="text-xs">draft</Badge>}
                            {pr.merged && <Badge variant="success" className="text-xs"><CheckCircle className="h-3 w-3" /> merged</Badge>}
                          </div>
                        </div>
                        <a
                          href={pr.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-fg-secondary hover:text-fg shrink-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
