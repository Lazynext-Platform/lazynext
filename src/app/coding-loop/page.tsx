import type { Metadata } from 'next';
import { GitBranch, Code, GitPullRequest, CheckCircle } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CodingLoopService } from '@/lib/services/coding-loop';
import { Card, Badge, EmptyState } from '@/components/ui';
import CodingLoopClient from './CodingLoopClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Coding Loop — Lazynext',
  description: 'Autonomous coding loop: GitHub issue → branch → code → PR → merge.',
  robots: { index: false, follow: false },
};

export default async function CodingLoopPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return (
      <div className="p-8">
        <Card className="p-8">
          <EmptyState
            icon={Code}
            title="Sign in required"
            description="Sign in to use the autonomous coding loop."
          />
        </Card>
      </div>
    );
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const workspace = workspaces[0];
  const loops = workspace ? await CodingLoopService.listLoops(workspace.id) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="heading-display text-2xl flex items-center gap-2">
          <GitBranch className="h-6 w-6" /> Coding Loop
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Autonomous coding loop: GitHub issue → create branch → generate code → create PR → verify → merge.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <GitBranch className="h-3 w-3" /> Total Loops
          </div>
          <div className="text-2xl font-semibold">{loops.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Code className="h-3 w-3" /> In Progress
          </div>
          <div className="text-2xl font-semibold">
            {loops.filter((l) => l.status === 'todo' || l.status === 'in_progress').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <GitPullRequest className="h-3 w-3" /> PRs Open
          </div>
          <div className="text-2xl font-semibold">
            {loops.filter((l) => l.prNumber).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <CheckCircle className="h-3 w-3" /> Merged
          </div>
          <div className="text-2xl font-semibold">
            {loops.filter((l) => l.status === 'done').length}
          </div>
        </Card>
      </div>

      {/* Start form + loop list */}
      <CodingLoopClient loops={loops} />
    </div>
  );
}
