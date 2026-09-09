'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Network,
  GitBranch,
  MessageSquare,
  ArrowRight,
  Plus,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

interface Workspace {
  id: string;
  name: string;
  organizationId: string;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  workspaceId: string;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  organizationId: string;
}

interface Collaboration {
  id: string;
  goalId?: string;
  planId?: string;
  title: string;
  description: string;
  participantAgentIds: string[];
  coordinatorAgentId: string;
  status: string;
  createdAt: string;
}

interface Workload {
  agentId: string;
  agentName: string;
  agentRole: string;
  activeTasks: number;
  pendingTasks: number;
  completedTasks: number;
  collaborationCount: number;
}

interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: string;
  content: string;
  taskId?: string;
  collaborationId?: string;
  createdAt: string;
}

interface OrchestrationDashboardProps {
  workspaces: Workspace[];
  agents: Agent[];
  goals: Goal[];
  collaborations: Collaboration[];
  workloads: Workload[];
  messages: AgentMessage[];
}

export function OrchestrationDashboard({
  workspaces,
  agents,
  goals,
  collaborations,
  workloads,
  messages,
}: OrchestrationDashboardProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCollaboration, setSelectedCollaboration] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id || '');
  const [goalId, setGoalId] = useState('');
  const [coordinatorId, setCoordinatorId] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const activeCollaborations = collaborations.filter((c) => c.status === 'active');
  const endedCollaborations = collaborations.filter((c) => c.status === 'ended');

  function getAgentName(agentId: string): string {
    return agents.find((a) => a.id === agentId)?.name || agentId.slice(0, 8);
  }

  function getAgentRole(agentId: string): string {
    return agents.find((a) => a.id === agentId)?.role || 'custom';
  }

  function toggleParticipant(agentId: string) {
    setSelectedParticipants((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId],
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/orchestration/collaborations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          goalId: goalId || undefined,
          title,
          description,
          participantAgentIds: selectedParticipants,
          coordinatorAgentId: coordinatorId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_create_collaboration');
      }
      setShowCreateForm(false);
      setTitle('');
      setDescription('');
      setGoalId('');
      setCoordinatorId('');
      setSelectedParticipants([]);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  async function handleEndCollaboration(collaborationId: string) {
    const outcome = window.prompt('Enter the outcome summary for this collaboration:');
    if (!outcome) return;
    try {
      const ws = workspaces[0];
      const res = await fetch(`/api/orchestration/collaborations/${collaborationId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: ws?.id, outcome }),
      });
      if (!res.ok) {
        throw new Error('failed_to_end_collaboration');
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  const wsAgents = agents.filter((a) => a.workspaceId === workspaceId);
  const wsGoals = goals.filter((g) =>
    workspaces.find((w) => w.id === workspaceId)?.organizationId === g.organizationId,
  );

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Network className="h-3 w-3" /> Active Collaborations
          </div>
          <div className="text-2xl font-semibold">{activeCollaborations.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Users className="h-3 w-3" /> Agents
          </div>
          <div className="text-2xl font-semibold">{agents.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Activity className="h-3 w-3" /> Active Tasks
          </div>
          <div className="text-2xl font-semibold">
            {workloads.reduce((sum, w) => sum + w.activeTasks, 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <MessageSquare className="h-3 w-3" /> Messages
          </div>
          <div className="text-2xl font-semibold">{messages.length}</div>
        </Card>
      </div>

      {/* Active Collaborations */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="heading-display text-lg flex items-center gap-2">
            <Network className="h-5 w-5" /> Active Collaborations
          </h2>
          <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4" /> Create Collaboration
          </Button>
        </div>

        {showCreateForm && (
          <Card className="p-6 mb-4">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Workspace</label>
                <select
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Q4 Campaign Launch"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the collaboration goal…"
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Goal (optional)</label>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  <option value="">— None —</option>
                  {wsGoals.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Coordinator Agent</label>
                <select
                  value={coordinatorId}
                  onChange={(e) => setCoordinatorId(e.target.value)}
                  required
                  className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  <option value="">— Select coordinator —</option>
                  {wsAgents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Participant Agents</label>
                <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border-2 p-3" style={{ borderColor: 'var(--c-ink)' }}>
                  {wsAgents.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(a.id)}
                        onChange={() => toggleParticipant(a.id)}
                      />
                      <span>{a.name}</span>
                      <Badge variant="default" className="text-xs">{a.role}</Badge>
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={creating || !coordinatorId || selectedParticipants.length === 0}>
                  {creating ? 'Creating…' : 'Create Collaboration'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {activeCollaborations.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={Network}
              title="No active collaborations"
              description="Create a collaboration to start coordinating multiple agents on a complex goal."
              action={<Button size="sm" onClick={() => setShowCreateForm(true)}><Plus className="h-4 w-4" /> Create Collaboration</Button>}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {activeCollaborations.map((collab) => (
              <Card key={collab.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Network className="h-4 w-4 text-fg-secondary shrink-0" />
                      <span className="text-sm font-semibold">{collab.title}</span>
                      <Badge variant="success" className="text-xs">{collab.status}</Badge>
                    </div>
                    {collab.description && (
                      <p className="text-sm text-fg-secondary line-clamp-2">{collab.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-fg-muted">Coordinator:</span>
                      <Badge variant="accent" className="text-xs">{getAgentName(collab.coordinatorAgentId)}</Badge>
                      <span className="text-xs text-fg-muted ml-2">Participants:</span>
                      {collab.participantAgentIds.map((id) => (
                        <Badge key={id} variant="default" className="text-xs">{getAgentName(id)}</Badge>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-fg-muted">
                      Created {new Date(collab.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedCollaboration(selectedCollaboration === collab.id ? null : collab.id)}
                    >
                      {selectedCollaboration === collab.id ? 'Hide' : 'Status'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEndCollaboration(collab.id)}
                    >
                      End
                    </Button>
                  </div>
                </div>
                {selectedCollaboration === collab.id && (
                  <CollaborationStatusView collaborationId={collab.id} agentNames={agents} />
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Agent Workload Overview */}
      <div>
        <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" /> Agent Workload
        </h2>
        {workloads.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={Users}
              title="No agents available"
              description="Set up agents to see their workload and collaboration activity."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workloads.map((w) => (
              <Card key={w.agentId} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-fg-secondary" />
                  <span className="text-sm font-semibold">{w.agentName}</span>
                  <Badge variant="default" className="text-xs">{w.agentRole}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3 text-info" />
                    <span className="text-fg-muted">Active:</span>
                    <span className="font-semibold">{w.activeTasks}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-warning" />
                    <span className="text-fg-muted">Pending:</span>
                    <span className="font-semibold">{w.pendingTasks}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    <span className="text-fg-muted">Done:</span>
                    <span className="font-semibold">{w.completedTasks}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Network className="h-3 w-3 text-accent" />
                    <span className="text-fg-muted">Collabs:</span>
                    <span className="font-semibold">{w.collaborationCount}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Agent Messages Feed */}
      <div>
        <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Agent Messages
        </h2>
        {messages.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              description="Agent messages will appear here once agents start communicating."
            />
          </Card>
        ) : (
          <Card className="p-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-1 text-xs shrink-0">
                    <Badge variant="info" className="text-xs">{msg.type}</Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-xs text-fg-muted">
                      <span className="font-medium">{getAgentName(msg.fromAgentId)}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium">{getAgentName(msg.toAgentId)}</span>
                    </div>
                    <p className="text-sm text-fg-secondary line-clamp-2 mt-1">{msg.content}</p>
                    <div className="text-xs text-fg-muted mt-1">
                      {new Date(msg.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Ended Collaborations */}
      {endedCollaborations.length > 0 && (
        <div>
          <h2 className="heading-display text-lg mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Ended Collaborations
          </h2>
          <div className="space-y-2">
            {endedCollaborations.map((collab) => (
              <Card key={collab.id} className="p-4 opacity-70">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-fg-secondary" />
                  <span className="text-sm font-semibold">{collab.title}</span>
                  <Badge variant="default" className="text-xs">ended</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Collaboration Status View (inline component) ──

function CollaborationStatusView({
  collaborationId,
  agentNames,
}: {
  collaborationId: string;
  agentNames: Array<{ id: string; name: string; role: string }>;
}) {
  const [status, setStatus] = useState<{
    participants: Array<{ id: string; name: string; role: string; currentTasks: number; completedTasks: number; pendingTasks: number }>;
    tasks: { total: number; completed: number; pending: number; inProgress: number };
    conflicts: Array<{ id: string; taskId: string; conflictingAgentIds: string[]; resolution: string; createdAt: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orchestration/collaborations/${collaborationId}/status`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setStatus(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [collaborationId]);

  if (loading) {
    return <div className="mt-4 text-xs text-fg-muted">Loading status…</div>;
  }

  if (!status) {
    return <div className="mt-4 text-xs text-danger">Failed to load status.</div>;
  }

  function getAgentName(agentId: string): string {
    return agentNames.find((a) => a.id === agentId)?.name || agentId.slice(0, 8);
  }

  return (
    <div className="mt-4 border-t border-border pt-4 space-y-4">
      {/* Task Summary */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-fg-muted">Total:</span>
          <span className="font-semibold">{status.tasks.total}</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3 text-info" />
          <span className="text-fg-muted">In Progress:</span>
          <span className="font-semibold">{status.tasks.inProgress}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-warning" />
          <span className="text-fg-muted">Pending:</span>
          <span className="font-semibold">{status.tasks.pending}</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-success" />
          <span className="text-fg-muted">Done:</span>
          <span className="font-semibold">{status.tasks.completed}</span>
        </div>
      </div>

      {/* Participants */}
      <div>
        <div className="text-xs font-medium text-fg-secondary mb-2">Participants</div>
        <div className="space-y-1">
          {status.participants.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <Users className="h-3 w-3 text-fg-secondary" />
              <span className="font-medium">{p.name}</span>
              <Badge variant="default" className="text-xs">{p.role}</Badge>
              <span className="text-fg-muted ml-auto">
                {p.currentTasks} active · {p.completedTasks} done · {p.pendingTasks} pending
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Conflicts */}
      {status.conflicts.length > 0 && (
        <div>
          <div className="text-xs font-medium text-fg-secondary mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Conflicts
          </div>
          <div className="space-y-1">
            {status.conflicts.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <Badge variant="warning" className="text-xs">{c.resolution}</Badge>
                <span className="text-fg-muted">Task: {c.taskId.slice(0, 8)}</span>
                <span className="text-fg-muted">
                  Agents: {c.conflictingAgentIds.map(getAgentName).join(', ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
