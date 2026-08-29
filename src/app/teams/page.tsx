'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Users, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import Link from 'next/link';

interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
  pendingInvitations: number;
  createdAt: string;
}

export default function TeamsPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const [teams, setTeams] = useState<TeamSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams');
      if (!res.ok) return;
      const data = await res.json();
      setTeams(data.teams || []);
    } catch {
      setTeams([]);
    }
  }, []);

  useEffect(() => {
    if (session?.user) loadTeams();
  }, [session, loadTeams]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewName('');
        loadTeams();
      } else {
        setError(data.error || 'Failed to create team');
      }
    } catch {
      setError('Failed to create team');
    }
    setCreating(false);
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> {t('team.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('team.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> {t('team.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('team.subtitle')}</p>
        </header>

        {/* Create team */}
        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t('team.createTeam')}
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('team.teamNamePlaceholder')}
              aria-label={t('team.teamNameLabel')}
              className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 transition disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('team.create')}
            </button>
          </div>
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        </section>

        {/* Teams list */}
        {teams === null ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Users className="w-8 h-8 mx-auto text-fg-muted mb-2" />
            <p className="text-sm text-fg-muted">{t('team.noTeams')}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="group rounded-lg border border-border bg-card p-4 transition hover:border-accent/40 hover:bg-card/80"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold">{team.name}</h3>
                    <p className="text-xs text-fg-muted mt-1">
                      {team.memberCount} {t('team.members')} · {t(`team.role.${team.role}`)}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-fg-muted group-hover:text-accent transition" />
                </div>
                {team.pendingInvitations > 0 && (
                  <p className="text-xs text-warning mt-2">{team.pendingInvitations} pending invitations</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
