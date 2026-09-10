import type { Metadata } from 'next';
import { GitBranch as Github, Plus, ExternalLink } from 'lucide-react';
import { auth } from '@/../auth';
import { GitHubService } from '@/lib/services/github';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import ConnectForm from './ConnectForm';
import { DisconnectButton } from './DisconnectButton';
import { RepoList } from './RepoList';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Developers — Lazynext',
  description: 'Connect GitHub and manage your repositories, issues, and pull requests.',
  robots: { index: false, follow: false },
};

export default async function DevelopersPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const status = await GitHubService.getStatus(session.user.id);

  // Not connected — show connect form
  if (!status.connected) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Developers</h1>
          <p className="text-sm text-fg-secondary mt-1">
            Connect your GitHub account to manage repos, issues, and pull requests.
          </p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Github}
            title="GitHub not connected"
            description="Connect your GitHub account to view repositories, issues, and pull requests directly from Lazynext."
            action={
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-fg-secondary hover:text-fg"
              >
                Create a token <ExternalLink className="h-3 w-3" />
              </a>
            }
          />
          {/* ConnectForm is a client component — lazy loaded below */}
          <div className="mt-6 border-t pt-6" style={{ borderColor: 'var(--c-ink)' }}>
            <ConnectForm />
          </div>
        </Card>
      </div>
    );
  }

  // Connected — fetch repos
  const repos = await GitHubService.listRepos(session.user.id, 1, 30);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="heading-display text-2xl flex items-center gap-2">
              <Github className="h-6 w-6" /> Developers
            </h1>
            <p className="text-sm text-fg-secondary mt-1">
              Manage your GitHub repositories, issues, and pull requests.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="success">
              <Github className="h-3 w-3 mr-1" /> @{status.username}
            </Badge>
            <DisconnectButton />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Github className="h-3 w-3" /> Connected
          </div>
          <div className="text-sm font-semibold">@{status.username}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Plus className="h-3 w-3" /> Repositories
          </div>
          <div className="text-2xl font-semibold">{repos.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <ExternalLink className="h-3 w-3" /> Profile
          </div>
          <a
            href={`https://github.com/${status.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-accent-primary hover:underline"
          >
            View on GitHub
          </a>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Github className="h-3 w-3" /> Token
          </div>
          <div className="text-sm font-semibold text-success">Active</div>
        </Card>
      </div>

      {/* Repositories + Issues/PRs */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Repositories</h2>
          <a
            href={`https://github.com/${status.username}?tab=repositories`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-fg-secondary hover:text-fg inline-flex items-center gap-1"
          >
            View all on GitHub <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <RepoList repos={repos} />
      </Card>
    </div>
  );
}
