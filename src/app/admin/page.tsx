'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Search, Users, Film, TrendingUp, AlertCircle, Plus, Minus, RefreshCw } from 'lucide-react';
import { formatNumber, formatDateTime } from '@/lib/i18n-format';

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
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-7 w-7 animate-spin text-white/40" /></div>;
  }

  if (forbidden) {
    return (
      <div className="grid min-h-screen place-items-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-white/60">Access denied. Your email is not in the admin list.</p>
      </div>
    );
  }

  const bg = { backgroundColor: '#131416', colorScheme: 'dark' as const };

  return (
    <main className="min-h-screen text-white" style={bg}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="pt-6 pb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-white/50">User management, credit adjustments, and creation monitoring.</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button onClick={() => setTab('users')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === 'users' ? 'bg-[#00b2fc] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
            <Users className="h-4 w-4" /> Users
          </button>
          <button onClick={() => setTab('creations')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === 'creations' ? 'bg-[#00b2fc] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
            <Film className="h-4 w-4" /> Creations
          </button>
        </div>

        {tab === 'users' && (
          <div>
            {/* Search */}
            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                  placeholder="Search by email…"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#00b2fc]"
                />
              </div>
              <button onClick={loadUsers} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/15">Search</button>
            </div>

            {/* Stats */}
            <div className="mb-4 text-xs text-white/40">{total} user{total !== 1 ? 's' : ''} total</div>

            {/* Table */}
            {users === null ? (
              <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>
            ) : users.length === 0 ? (
              <div className="grid place-items-center py-12 text-sm text-white/40">No users found.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.03] text-xs uppercase text-white/40">
                    <tr>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-right">Credits</th>
                      <th className="px-4 py-3 text-right">Creations</th>
                      <th className="px-4 py-3 text-left">Joined</th>
                      <th className="px-4 py-3 text-left">Adjust</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="font-medium text-white/90">{u.name || '—'}</div>
                          <div className="text-xs text-white/40">{u.email}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#00b2fc]">{u.credits}</td>
                        <td className="px-4 py-3 text-right text-white/60">{u._count.creations}</td>
                        <td className="px-4 py-3 text-xs text-white/40">{formatDateTime(u.createdAt, 'en')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={adjusting === u.id ? adjustAmount : ''}
                              onChange={(e) => { setAdjusting(u.id); setAdjustAmount(e.target.value); }}
                              placeholder="±N"
                              className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-[#00b2fc]"
                            />
                            <input
                              value={adjusting === u.id ? adjustReason : ''}
                              onChange={(e) => { setAdjusting(u.id); setAdjustReason(e.target.value); }}
                              placeholder="reason"
                              className="w-24 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-[#00b2fc]"
                            />
                            <button
                              onClick={() => adjustCredits(u.id)}
                              disabled={adjusting !== u.id || !adjustAmount}
                              className="rounded bg-[#00b2fc]/20 px-2 py-1 text-xs text-[#00b2fc] hover:bg-[#00b2fc]/30 disabled:opacity-30"
                            >
                              Apply
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
              <button onClick={() => setStatusFilter('')} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${!statusFilter ? 'bg-[#00b2fc] text-white' : 'bg-white/5 text-white/60'}`}>All</button>
              {statusCounts.map((sc) => (
                <button key={sc.status} onClick={() => setStatusFilter(sc.status)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${statusFilter === sc.status ? 'bg-[#00b2fc] text-white' : 'bg-white/5 text-white/60'}`}>
                  {sc.status} ({sc._count})
                </button>
              ))}
              <button onClick={loadCreations} className="ml-auto rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/15"><RefreshCw className="h-3 w-3 inline" /> Refresh</button>
            </div>

            <div className="mb-4 text-xs text-white/40">{total} creation{total !== 1 ? 's' : ''}</div>

            {creations === null ? (
              <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>
            ) : creations.length === 0 ? (
              <div className="grid place-items-center py-12 text-sm text-white/40">No creations found.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.03] text-xs uppercase text-white/40">
                    <tr>
                      <th className="px-4 py-3 text-left">Template</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Prompt</th>
                      <th className="px-4 py-3 text-right">Cost</th>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Created</th>
                      <th className="px-4 py-3 text-left">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {creations.map((c) => (
                      <tr key={c.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-xs text-white/60">{c.templateId}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                            c.status === 'completed' ? 'bg-green-500/15 text-green-400' :
                            c.status === 'failed' ? 'bg-red-500/15 text-red-400' :
                            c.status === 'processing' ? 'bg-blue-500/15 text-blue-400' :
                            'bg-white/10 text-white/60'
                          }`}>{c.status}</span>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-xs text-white/50">{c.prompt || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-white/60">{c.cost}</td>
                        <td className="px-4 py-3 text-xs text-white/40">{c.userId.slice(0, 8)}…</td>
                        <td className="px-4 py-3 text-xs text-white/40">{formatDateTime(c.createdAt, 'en')}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-xs text-red-400/70">{c.error || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
