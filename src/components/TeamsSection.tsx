'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Users, Plus, Trash2, Loader2, Copy, Check,
  Crown, Edit, Eye, UserPlus,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
  pendingInvitations: number;
  createdAt: string;
}

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  name: string;
  email: string | null;
  image: string | null;
  joinedAt: string;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

interface TeamDetail {
  id: string;
  name: string;
  slug: string;
  role: string;
  members: TeamMember[];
  pendingInvitations: TeamInvitation[];
}

const ROLE_ICON: Record<string, typeof Crown> = {
  owner: Crown,
  editor: Edit,
  viewer: Eye,
};

export function TeamsSection() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/teams/${id}`);
      if (res.ok) {
        setDetail(await res.json());
      } else {
        setDetail(null);
      }
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadDetail(selectedTeamId);
    } else {
      setDetail(null);
    }
  }, [selectedTeamId, loadDetail]);

  const handleCreate = async () => {
    setError('');
    const name = newTeamName.trim();
    if (!name) {
      setError(t('teams.createPlaceholder'));
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create team');
      } else {
        setNewTeamName('');
        await loadTeams();
        setSelectedTeamId(data.id);
      }
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    setInviteError('');
    setInviteUrl(null);
    const email = inviteEmail.trim();
    if (!email || !email.includes('@')) {
      setInviteError(t('teams.inviteEmail'));
      return;
    }
    setInviting(true);
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMap: Record<string, string> = {
          already_member: t('teams.alreadyMember'),
          invitation_already_sent: t('teams.invitationAlreadySent'),
          valid_email_required: t('teams.inviteEmail'),
          invalid_role: t('teams.inviteRole'),
          not_authorized: t('teams.cannotDemoteOwner'),
        };
        setInviteError(errMap[data.error] || data.error || 'Failed to send invitation');
      } else {
        setInviteUrl(data.inviteUrl);
        setInviteEmail('');
        if (selectedTeamId) await loadDetail(selectedTeamId);
        await loadTeams();
      }
    } catch {
      setInviteError('Network error');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'cannot_demote_owner') {
          setInviteError(t('teams.cannotDemoteOwner'));
        }
      } else if (selectedTeamId) {
        await loadDetail(selectedTeamId);
      }
    } catch {
      /* ignore */
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/members/${memberId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        if (selectedTeamId) await loadDetail(selectedTeamId);
        await loadTeams();
      } else if (data.error === 'cannot_remove_owner') {
        setInviteError(t('teams.cannotRemoveOwner'));
      }
    } catch {
      /* ignore */
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeamId) return;
    if (!window.confirm(t('teams.deleteConfirm'))) return;
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedTeamId(null);
        setDetail(null);
        await loadTeams();
      }
    } catch {
      /* ignore */
    }
  };

  const handleCopyUrl = async (url: string, id: string) => {
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const roleLabel = (role: string) => {
    if (role === 'owner') return t('teams.roleOwner');
    if (role === 'editor') return t('teams.roleEditor');
    return t('teams.roleViewer');
  };

  const isOwner = detail?.role === 'owner';
  const currentUserId = session?.user?.id;

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="mb-2 font-semibold text-fg">{t('teams.title')}</h2>
      <p className="mb-4 text-sm text-fg-faint">{t('teams.description')}</p>

      {/* Create team form */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder={t('teams.createPlaceholder')}
            className="min-w-0 flex-1 rounded-xl border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-fg-secondary"
            aria-label={t('teams.createPlaceholder')}
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            style={{ background: '#0064d9' }}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('teams.createButton')}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-danger">{error}</p>
        )}
      </div>

      {/* Teams list */}
      {loading ? (
        <p className="text-sm text-fg-faint">{t('common.loadingDots')}</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-fg-faint">{t('teams.noTeams')}</p>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const RoleIcon = ROLE_ICON[team.role] || Eye;
            const isSelected = selectedTeamId === team.id;
            return (
              <div key={team.id} className="rounded-xl border border-line bg-app p-4">
                <button
                  onClick={() => setSelectedTeamId(isSelected ? null : team.id)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-fg-secondary" />
                    <span className="truncate text-sm font-medium text-fg">{team.name}</span>
                    <span className="flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-0.5 text-xs text-fg-secondary">
                      <RoleIcon className="h-3 w-3" />
                      {roleLabel(team.role)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-fg-faint">
                    <span>{t('teams.memberCount', { '0': team.memberCount })}</span>
                    {team.pendingInvitations > 0 && (
                      <span>{t('teams.pendingInvites', { '0': team.pendingInvitations })}</span>
                    )}
                  </div>
                </button>

                {/* Team detail panel */}
                {isSelected && (
                  <div className="mt-4 border-t border-line pt-4">
                    {detailLoading ? (
                      <p className="text-sm text-fg-faint">{t('common.loadingDots')}</p>
                    ) : detail ? (
                      <div className="space-y-4">
                        {/* Members list */}
                        <div>
                          <p className="mb-2 text-xs font-medium text-fg-secondary">{t('teams.members')}</p>
                          <div className="space-y-2">
                            {detail.members.map((m) => {
                              const MIcon = ROLE_ICON[m.role] || Eye;
                              const isSelf = m.userId === currentUserId;
                              const canRemove = isOwner || isSelf;
                              const isTeamOwner = detail.role === 'owner' && m.role === 'owner';
                              return (
                                <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2">
                                  <div className="flex min-w-0 items-center gap-2">
                                    {m.image ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={m.image} alt="" className="h-6 w-6 shrink-0 rounded-full" />
                                    ) : (
                                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-line text-xs text-fg-secondary">
                                        {(m.name || m.email || '?')[0]?.toUpperCase()}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="truncate text-sm text-fg">{m.name}</p>
                                      {m.email && <p className="truncate text-xs text-fg-faint">{m.email}</p>}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    {/* Role selector (owner only) */}
                                    {isOwner && !isTeamOwner ? (
                                      <select
                                        value={m.role}
                                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                                        className="rounded-lg border border-line bg-app px-2 py-1 text-xs text-fg-secondary outline-none focus:border-fg-secondary"
                                        aria-label={t('teams.inviteRole')}
                                      >
                                        <option value="editor">{t('teams.roleEditor')}</option>
                                        <option value="viewer">{t('teams.roleViewer')}</option>
                                      </select>
                                    ) : (
                                      <span className="flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-xs text-fg-secondary">
                                        <MIcon className="h-3 w-3" />
                                        {roleLabel(m.role)}
                                      </span>
                                    )}
                                    {canRemove && !isTeamOwner && (
                                      <button
                                        onClick={() => handleRemoveMember(m.id)}
                                        className="rounded-lg px-2 py-1 text-xs font-medium text-danger transition hover:bg-line"
                                        aria-label={isSelf ? t('teams.leaveTeam') : t('teams.removeMember')}
                                      >
                                        {isSelf ? t('teams.leaveTeam') : t('teams.removeMember')}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Invite form (owner or editor) */}
                        {(isOwner || detail.role === 'editor') && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-fg-secondary">{t('teams.inviteMember')}</p>
                            <div className="flex flex-wrap gap-2">
                              <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder={t('teams.inviteEmail')}
                                className="min-w-[160px] flex-1 rounded-xl border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-fg-secondary"
                                aria-label={t('teams.inviteEmail')}
                              />
                              <select
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                className="rounded-xl border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-fg-secondary"
                                aria-label={t('teams.inviteRole')}
                              >
                                <option value="viewer">{t('teams.roleViewer')}</option>
                                <option value="editor">{t('teams.roleEditor')}</option>
                              </select>
                              <button
                                onClick={handleInvite}
                                disabled={inviting}
                                className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                                style={{ background: '#0064d9' }}
                              >
                                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                {t('teams.inviteButton')}
                              </button>
                            </div>
                            {inviteError && (
                              <p role="alert" className="text-xs text-danger">{inviteError}</p>
                            )}
                            {inviteUrl && (
                              <div className="flex items-center gap-2 rounded-lg border border-line bg-app px-3 py-2">
                                <code className="min-w-0 flex-1 break-all text-xs text-fg-secondary">
                                  {typeof window !== 'undefined' ? `${window.location.origin}${inviteUrl}` : inviteUrl}
                                </code>
                                <button
                                  onClick={() => handleCopyUrl(inviteUrl, 'new')}
                                  className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-fg-secondary transition hover:bg-line"
                                  aria-label={t('teams.inviteUrl')}
                                >
                                  {copiedId === 'new' ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                                  {copiedId === 'new' ? t('teams.inviteUrlCopied') : t('teams.inviteUrl')}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pending invitations */}
                        {detail.pendingInvitations.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-medium text-fg-secondary">
                              {t('teams.pendingInvites', { '0': detail.pendingInvitations.length })}
                            </p>
                            <div className="space-y-2">
                              {detail.pendingInvitations.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm text-fg">{inv.email}</p>
                                    <p className="text-xs text-fg-faint">
                                      {t('teams.inviteExpires', { '0': new Date(inv.expiresAt).toLocaleDateString() })}
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded-md border border-line px-2 py-0.5 text-xs text-fg-secondary">
                                    {roleLabel(inv.role)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Delete team (owner only) */}
                        {isOwner && (
                          <div className="border-t border-line pt-3">
                            <button
                              onClick={handleDeleteTeam}
                              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-danger transition hover:bg-line"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('teams.deleteTeam')}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-fg-faint">—</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
