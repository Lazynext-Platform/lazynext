'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, Shield, AlertCircle, Loader2, Crown } from 'lucide-react';
import { Card, Badge, Button, Input } from '@/components/ui';

interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; image: string | null };
}

const ROLES = ['owner', 'admin', 'member', 'viewer', 'guest'] as const;

export function WorkspaceAdmin({ workspaceId, currentRole }: { workspaceId: string; currentRole: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canManage = currentRole === 'owner' || currentRole === 'admin';

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/members?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, email: inviteEmail.trim(), role: inviteRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error === 'user_not_found'
          ? 'User not found. They must create an account first.'
          : data.error || 'Failed to invite');
      }
      setSuccess(`Invited ${inviteEmail} as ${inviteRole}`);
      setInviteEmail('');
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(memberId: string, newRole: string) {
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update role');
      }
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this member from the workspace?')) return;
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to remove');
      }
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 border-2 text-sm" style={{ borderColor: 'var(--c-danger)', borderRadius: 'var(--radius-sm)', color: 'var(--c-danger)' }}>
          <AlertCircle className="h-4 w-4 inline mr-2" />{error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 border-2 text-sm" style={{ borderColor: 'var(--c-success)', borderRadius: 'var(--radius-sm)', color: 'var(--c-success)' }}>
          {success}
        </div>
      )}

      {/* Invite form */}
      {canManage && (
        <Card className="p-4 mb-6">
          <h3 className="heading-display text-sm mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Invite member
          </h3>
          <form onSubmit={inviteMember} className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="border-2 bg-surface px-3 py-2.5 text-sm"
              style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              {ROLES.filter((r) => r !== 'owner').map((r) => (
                <option key={r} value={r} className="capitalize">{r}</option>
              ))}
            </select>
            <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite'}
            </Button>
          </form>
        </Card>
      )}

      {/* Members list */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--c-ink)' }}>
          <h3 className="heading-display text-sm flex items-center gap-2">
            <Users className="h-4 w-4" /> Members ({members.length})
          </h3>
        </div>
        <div className="divide-y-2" style={{ borderColor: 'var(--c-ink)' }}>
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              {m.user.image && /^https?:\/\//i.test(m.user.image) ? (
                <img src={m.user.image} alt="" className="h-8 w-8 rounded-[var(--radius-sm)]" />
              ) : (
                <span
                  className="flex h-8 w-8 items-center justify-center text-sm font-bold border-2"
                  style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                >
                  {(m.user.name || m.user.email || '?')[0]?.toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.user.name || 'Unknown'}</p>
                <p className="text-xs text-fg-muted truncate">{m.user.email}</p>
              </div>
              {m.role === 'owner' ? (
                <Badge variant="success"><Crown className="h-3 w-3" /> owner</Badge>
              ) : canManage ? (
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value)}
                    className="border-2 bg-surface px-2 py-1 text-xs"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  >
                    {ROLES.filter((r) => r !== 'owner').map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeMember(m.id)}
                    className="p-1 hover:bg-surface rounded transition-colors"
                    aria-label="Remove member"
                  >
                    <Trash2 className="h-4 w-4" style={{ color: 'var(--c-danger)' }} />
                  </button>
                </div>
              ) : (
                <Badge>{m.role}</Badge>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
