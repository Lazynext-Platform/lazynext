'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Users, Activity, UserPlus, Crown, Edit3, Eye, Trash2, Clock, Circle } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface TeamMember {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string; image: string | null };
  joinedAt: string;
}

interface ActivityEntry {
  id: string;
  type: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
}

interface PresenceMember {
  userId: string;
  userName: string;
  userImage: string | null;
  page: string;
  onlineFor: number;
}

interface TeamData {
  id: string;
  name: string;
  slug: string;
  role: string;
  members: TeamMember[];
  pendingInvitations: number;
}

const ACTIVITY_ICONS: Record<string, string> = {
  member_joined: '👋',
  member_left: '👋',
  role_changed: '🔄',
  project_created: '✨',
  project_updated: '📝',
  project_shared: '🔗',
  comment_added: '💬',
  approval_requested: '⏳',
  approval_granted: '✅',
  custom: '📌',
};

const ROLE_ICONS: Record<string, typeof Crown> = {
  owner: Crown,
  editor: Edit3,
  viewer: Eye,
};

export function TeamWorkspace({ teamId }: { teamId: string }) {
  const { t } = useI18n();
  const { data: session } = useSession();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [presence, setPresence] = useState<PresenceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load team data
  const loadTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}`);
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setTeam(data);
    } catch {
      setError(t('team.error'));
    }
  }, [teamId, t]);

  // Load activity feed
  const loadActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/activity?limit=30`);
      if (!res.ok) return;
      const data = await res.json();
      setActivities(data.activities || []);
    } catch {
      // silent
    }
  }, [teamId]);

  // Load presence
  const loadPresence = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/presence`);
      if (!res.ok) return;
      const data = await res.json();
      setPresence(data.members || []);
    } catch {
      // silent
    }
  }, [teamId]);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: window.location.pathname }),
      });
      if (res.ok) {
        const data = await res.json();
        setPresence(data.members || []);
      }
    } catch {
      // silent
    }
  }, [teamId]);

  // Initial load + heartbeat setup
  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadTeam(), loadActivity(), loadPresence()]);
      setLoading(false);
      // Send initial heartbeat
      sendHeartbeat();
      // Set up heartbeat interval (every 15s)
      heartbeatRef.current = setInterval(sendHeartbeat, 15000);
      // Set up presence polling (every 20s)
      const presenceInterval = setInterval(loadPresence, 20000);
      // Set up activity polling (every 30s)
      const activityInterval = setInterval(loadActivity, 30000);
      // Cleanup on unload
      const handleUnload = () => {
        fetch(`/api/teams/${teamId}/presence`, { method: 'DELETE' }).catch(() => {});
      };
      window.addEventListener('beforeunload', handleUnload);
      return () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        clearInterval(presenceInterval);
        clearInterval(activityInterval);
        window.removeEventListener('beforeunload', handleUnload);
        handleUnload();
      };
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  // Send invite
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteMsg(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteMsg(t('team.inviteSent'));
        setInviteEmail('');
        // Record activity
        await fetch(`/api/teams/${teamId}/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'custom',
            summary: `Invited ${inviteEmail} as ${inviteRole}`,
          }),
        });
        loadActivity();
      } else {
        setInviteMsg(data.error || t('team.inviteFailed'));
      }
    } catch {
      setInviteMsg(t('team.inviteFailed'));
    }
  };

  // Change member role
  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        await fetch(`/api/teams/${teamId}/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'role_changed', summary: `Changed member role to ${newRole}` }),
        });
        loadTeam();
        loadActivity();
      }
    } catch {
      // silent
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm(t('team.confirmRemove'))) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${memberId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetch(`/api/teams/${teamId}/activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'member_left', summary: 'A member was removed' }),
        });
        loadTeam();
        loadActivity();
      }
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="text-center py-20">
        <p className="text-danger">{error || t('team.notFound')}</p>
      </div>
    );
  }

  const isOwner = team.role === 'owner';
  const onlineUserIds = new Set(presence.map(p => p.userId));

  return (
    <div id="main-content" className="space-y-6">
      {/* Team header */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            {team.name}
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            {t('team.slug')}: {team.slug} · {team.members.length} {t('team.members')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-success/10 text-success">
            <Circle className="w-2 h-2 fill-current" />
            {presence.length} {t('team.online')}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Members + Invite */}
        <div className="lg:col-span-1 space-y-4">
          {/* Invite section */}
          {isOwner && (
            <section className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> {t('team.inviteMember')}
              </h2>
              <div className="space-y-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t('team.emailPlaceholder')}
                  aria-label={t('team.emailLabel')}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  aria-label={t('team.roleLabel')}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="viewer">{t('team.roleViewer')}</option>
                  <option value="editor">{t('team.roleEditor')}</option>
                </select>
                <button
                  onClick={handleInvite}
                  className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90 transition"
                >
                  {t('team.sendInvite')}
                </button>
                {inviteMsg && (
                  <p role="status" className="text-xs text-fg-muted">{inviteMsg}</p>
                )}
              </div>
            </section>
          )}

          {/* Members list */}
          <section className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" /> {t('team.members')}
            </h2>
            <ul className="space-y-2">
              {team.members.map((m) => {
                const RoleIcon = ROLE_ICONS[m.role] || Eye;
                const isOnline = onlineUserIds.has(m.user.id);
                const presenceInfo = presence.find(p => p.userId === m.user.id);
                return (
                  <li key={m.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="relative">
                      {m.user.image ? (
                        <img src={m.user.image} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium">
                          {(m.user.name || m.user.email)[0].toUpperCase()}
                        </div>
                      )}
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.user.name || m.user.email}</p>
                      <p className="text-xs text-fg-muted truncate">
                        {isOnline && presenceInfo ? presenceInfo.page : m.user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <RoleIcon className="w-3.5 h-3.5 text-fg-muted" />
                      <span className="text-xs text-fg-muted">{t(`team.role.${m.role}`)}</span>
                      {isOwner && m.role !== 'owner' && (
                        <>
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.id, e.target.value)}
                            aria-label={t('team.changeRole')}
                            className="ml-1 text-xs rounded border border-border bg-input px-1 py-0.5"
                          >
                            <option value="viewer">{t('team.roleViewer')}</option>
                            <option value="editor">{t('team.roleEditor')}</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            aria-label={t('team.removeMember')}
                            className="p-1 text-danger hover:bg-danger/10 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Right column: Activity feed + Presence */}
        <div className="lg:col-span-2 space-y-4">
          {/* Online presence */}
          <section className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Circle className="w-4 h-4 text-success fill-current" /> {t('team.onlineNow')}
            </h2>
            {presence.length === 0 ? (
              <p className="text-sm text-fg-muted">{t('team.noOneOnline')}</p>
            ) : (
              <ul className="space-y-2">
                {presence.map((p) => (
                  <li key={p.userId} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="font-medium">{p.userName}</span>
                    <span className="text-fg-muted">·</span>
                    <span className="text-fg-muted truncate">{p.page}</span>
                    <span className="text-xs text-fg-muted ml-auto">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {p.onlineFor}s
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Activity feed */}
          <section className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" /> {t('team.activityFeed')}
            </h2>
            {activities.length === 0 ? (
              <p className="text-sm text-fg-muted">{t('team.noActivity')}</p>
            ) : (
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <span className="text-lg flex-shrink-0">{ACTIVITY_ICONS[a.type] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-fg">{a.summary}</p>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {a.user.name || a.user.email} · {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
