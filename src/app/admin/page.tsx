'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Loader2, Search, Users, Film, TrendingUp, AlertCircle, Plus, Minus, RefreshCw, MessageSquare } from 'lucide-react';
import { formatNumber, formatDateTime } from '@/lib/i18n-format';
import { useI18n } from '@/i18n/provider';

type AdminUser = {
  id: string; name: string | null; email: string | null;
  credits: number; createdAt: string;
  _count: { creations: number };
};

type AdminCreation = {
  id: string; userId: string; templateId: string; status: string;
  prompt: string; cost: number; error: string | null;
  createdAt: string; updatedAt: string;
};

type StatusCount = { status: string; _count: number };

export default function AdminPage() {
  const { status } = useSession();
  const { t } = useI18n();
  const [tab, setTab] = useState<'users' | 'creations'>('users');
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [creations, setCreations] = useState<AdminCreation[] | null>(null);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const loadUsers = useCallback(() => {
    setUsers(null);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    fetch(`/api/admin/users?${params}`)
      .then((r) => { if (r.status === 403) { setForbidden(true); throw new Error('forbidden'); } return r.json(); })
      .then((j) => { setUsers(j.users || []); setTotal(j.total || 0); })
      .catch(() => {});
  }, [search]);

  const loadCreations = useCallback(() => {
    setCreations(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/admin/creations?${params}`)
      .then((r) => { if (r.status === 403) { setForbidden(true); throw new Error('forbidden'); } return r.json(); })
      .then((j) => { setCreations(j.creations || []); setTotal(j.total || 0); setStatusCounts(j.statusCounts || []); })
      .catch(() => {});
  }, [statusFilter]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (tab === 'users') loadUsers();
    else loadCreations();
  }, [status, tab, loadUsers, loadCreations]);

  async function adjustCredits(userId: string) {
    const amount = parseInt(adjustAmount, 10);
    if (!Number.isFinite(amount) || amount === 0) return;
    setAdjusting(userId);
    try {
      await fetch(`/api/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: adjustReason || undefined }),
      });
      setAdjustAmount(''); setAdjustReason('');
      loadUsers();
    } catch { /* ignore */ }
    setAdjusting(null);
  }

  if (status === 'loading') {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-7 w-7 animate-spin text-fg-faint" /></div>;
  }

  if (forbidden) {
    return (
      <div className="grid min-h-screen place-items-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-danger" />
        <p className="text-fg-muted">Access denied. Your email is not in the admin list.</p>
      </div>
    );
  }
return (
    <div className="min-h-screen text-fg bg-app">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="pt-6 pb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('admin.title')}</h1>
          <p className="mt-1 text-sm text-fg-faint">{t('admin.subtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button onClick={() => setTab('users')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === 'users' ? 'bg-[#0064d9] text-white' : 'bg-hover text-fg-muted hover:bg-elevated'}`}>
            <Users className="h-4 w-4" /> {t('admin.tabUsers')}
          </button>
          <button onClick={() => setTab('creations')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === 'creations' ? 'bg-[#0064d9] text-white' : 'bg-hover text-fg-muted hover:bg-elevated'}`}>
            <Film className="h-4 w-4" /> {t('admin.tabCreations')}
          </button>
          <Link href="/admin/feedback" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition bg-hover text-fg-muted hover:bg-elevated">
            <MessageSquare className="h-4 w-4" /> {t('adminFeedback.tabFeedback')}
          </Link>
        </div>

        {tab === 'users' && (
          <div>
            {/* Search */}
            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-placeholder" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                  placeholder={t('admin.searchPlaceholder')}
                  aria-label={t('admin.searchPlaceholder')}
                  className="w-full rounded-lg border border-line bg-surface py-2 pl-10 pr-4 text-sm text-fg placeholder:text-fg-placeholder outline-none focus:border-[#00b2fc]"
                />
              </div>
              <button onClick={loadUsers} className="rounded-lg bg-elevated px-4 py-2 text-sm font-medium text-fg-secondary hover:bg-active">{t('admin.search')}</button>
            </div>

            {/* Stats */}
            <div className="mb-4 text-xs text-fg-faint">{total} user{total !== 1 ? 's' : ''} total</div>

            {/* Table */}
            {users === null ? (
              <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-fg-placeholder" /></div>
            ) : users.length === 0 ? (
              <div className="grid place-items-center py-12 text-sm text-fg-faint">{t('admin.noUsers')}</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-sm">
                  <caption className="sr-only">{t('admin.userManagement')}</caption>
                  <thead className="bg-surface text-xs uppercase text-fg-faint">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left">{t('admin.colUser')}</th>
                      <th scope="col" className="px-4 py-3 text-right">{t('admin.colCredits')}</th>
                      <th scope="col" className="px-4 py-3 text-right">{t('admin.colCreations')}</th>
                      <th scope="col" className="px-4 py-3 text-left">{t('admin.colJoined')}</th>
                      <th scope="col" className="px-4 py-3 text-left">{t('admin.colAdjust')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-hover">
                        <td className="px-4 py-3">
                          <div className="font-medium text-fg">{u.name || '—'}</div>
                          <div className="text-xs text-fg-faint">{u.email}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-brand-accent">{u.credits}</td>
                        <td className="px-4 py-3 text-right text-fg-muted">{u._count.creations}</td>
                        <td className="px-4 py-3 text-xs text-fg-faint">{formatDateTime(u.createdAt, 'en')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              aria-label="Credit adjustment amount"
                              value={adjusting === u.id ? adjustAmount : ''}
                              onChange={(e) => { setAdjusting(u.id); setAdjustAmount(e.target.value); }}
                              placeholder={t('admin.creditsAdjust')}
                              className="w-16 rounded border border-line bg-hover px-2 py-1 text-xs text-fg outline-none focus:border-[#00b2fc]"
                            />
                            <input
                              aria-label="Credit adjustment reason"
                              value={adjusting === u.id ? adjustReason : ''}
                              onChange={(e) => { setAdjusting(u.id); setAdjustReason(e.target.value); }}
                              placeholder={t('admin.reason')}
                              className="w-24 rounded border border-line bg-hover px-2 py-1 text-xs text-fg outline-none focus:border-[#00b2fc]"
                            />
                            <button
                              onClick={() => adjustCredits(u.id)}
                              disabled={adjusting !== u.id || !adjustAmount}
                              className="rounded bg-[#00b2fc]/20 px-2 py-1 text-xs text-brand-accent hover:bg-[#00b2fc]/30 disabled:opacity-30"
                            >
                              {t('admin.apply')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'creations' && (
          <div>
            {/* Status filter + counts */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button onClick={() => setStatusFilter('')} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${!statusFilter ? 'bg-[#0064d9] text-white' : 'bg-hover text-fg-muted'}`}>{t('admin.filterAll')}</button>
              {statusCounts.map((sc) => (
                <button key={sc.status} onClick={() => setStatusFilter(sc.status)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${statusFilter === sc.status ? 'bg-[#0064d9] text-white' : 'bg-hover text-fg-muted'}`}>
                  {sc.status} ({sc._count})
                </button>
              ))}
              <button onClick={loadCreations} className="ml-auto rounded-lg bg-elevated px-3 py-1.5 text-xs text-fg-muted hover:bg-active"><RefreshCw className="h-3 w-3 inline" /> {t('admin.refresh')}</button>
            </div>

            <div className="mb-4 text-xs text-fg-faint">{total} creation{total !== 1 ? 's' : ''}</div>

            {creations === null ? (
              <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-fg-placeholder" /></div>
            ) : creations.length === 0 ? (
              <div className="grid place-items-center py-12 text-sm text-fg-faint">{t('admin.noCreations')}</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-sm">
                  <caption className="sr-only">{t('admin.creationMonitoring')}</caption>
                  <thead className="bg-surface text-xs uppercase text-fg-faint">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left">{t('admin.colTemplate')}</th>
                      <th scope="col" className="px-4 py-3 text-left">{t('admin.colStatus')}</th>
                      <th scope="col" className="px-4 py-3 text-left">{t('admin.colPrompt')}</th>
                      <th scope="col" className="px-4 py-3 text-right">{t('admin.colCost')}</th>
                      <th scope="col" className="px-4 py-3 text-left">{t('admin.colUser')}</th>
                      <th scope="col" className="px-4 py-3 text-left">{t('admin.colCreated')}</th>
                      <th scope="col" className="px-4 py-3 text-left">{t('admin.colError')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {creations.map((c) => (
                      <tr key={c.id} className="hover:bg-hover">
                        <td className="px-4 py-3 text-xs text-fg-muted">{c.templateId}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                            c.status === 'completed' ? 'bg-success/15 text-success' :
                            c.status === 'failed' ? 'bg-danger/15 text-danger' :
                            c.status === 'processing' ? 'bg-info/15 text-info' :
                            'bg-elevated text-fg-muted'
                          }`}>{c.status}</span>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-xs text-fg-faint">{c.prompt || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-fg-muted">{c.cost}</td>
                        <td className="px-4 py-3 text-xs text-fg-faint">{c.userId.slice(0, 8)}…</td>
                        <td className="px-4 py-3 text-xs text-fg-faint">{formatDateTime(c.createdAt, 'en')}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-xs text-danger/70">{c.error || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
