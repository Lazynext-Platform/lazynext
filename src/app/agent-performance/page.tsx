'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Award, TrendingUp, AlertCircle, Loader2, Trophy, AlertTriangle, XCircle } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';

interface AgentPerfStats {
  totalRuns: number;
  totalScore: number;
  averageScore: number;
  rewardCount: number;
  correctionCount: number;
  failureCount: number;
  lastScore: number;
  lastBand: string;
  updatedAt: string;
}

interface AgentPerf {
  agentId: string;
  role: string;
  stats: AgentPerfStats;
}

interface OrgPerf {
  agents: AgentPerf[];
  totals: {
    runs: number;
    averageScore: number;
    rewards: number;
    corrections: number;
    failures: number;
  };
}

function scoreColor(s: number): string {
  if (s >= 90) return 'text-success';
  if (s >= 75) return 'text-brand-accent';
  if (s >= 50) return 'text-warning';
  return 'text-danger';
}

function bandIcon(band: string) {
  if (band === 'reward') return <Trophy className="w-4 h-4 text-success" />;
  if (band === 'correction') return <AlertTriangle className="w-4 h-4 text-warning" />;
  if (band === 'failure') return <XCircle className="w-4 h-4 text-danger" />;
  return null;
}

export default function AgentPerformancePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<OrgPerf | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) {
      setShowAuth(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/agent-performance');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'load_failed');
        return;
      }
      setData(json);
    } catch {
      setError('network_error');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-muted">Sign in to view agent performance.</p>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="w-6 h-6 text-brand-accent" />
          Agent Performance
        </h1>
        <p className="text-muted text-sm mt-1">
          Reward engine scores for completed agent tasks. Scores are based on verification pass, time efficiency, no regression, output quality, and attempt count.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-lg border border-border bg-surface">
              <div className="text-xs text-muted">Total Runs</div>
              <div className="text-2xl font-bold mt-1">{data.totals.runs}</div>
            </div>
            <div className="p-4 rounded-lg border border-border bg-surface">
              <div className="text-xs text-muted">Avg Score</div>
              <div className={`text-2xl font-bold mt-1 ${scoreColor(data.totals.averageScore)}`}>
                {data.totals.averageScore}/100
              </div>
            </div>
            <div className="p-4 rounded-lg border border-border bg-surface">
              <div className="text-xs text-muted">Rewards</div>
              <div className="text-2xl font-bold mt-1 text-success flex items-center gap-1">
                <Trophy className="w-5 h-5" /> {data.totals.rewards}
              </div>
            </div>
            <div className="p-4 rounded-lg border border-border bg-surface">
              <div className="text-xs text-muted">Failures</div>
              <div className="text-2xl font-bold mt-1 text-danger flex items-center gap-1">
                <XCircle className="w-5 h-5" /> {data.totals.failures}
              </div>
            </div>
          </div>

          {/* Agent table */}
          {data.agents.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-border/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Agent Role</th>
                    <th className="text-right p-3 font-medium">Runs</th>
                    <th className="text-right p-3 font-medium">Avg Score</th>
                    <th className="text-right p-3 font-medium">Rewards</th>
                    <th className="text-right p-3 font-medium">Corrections</th>
                    <th className="text-right p-3 font-medium">Failures</th>
                    <th className="text-center p-3 font-medium">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agents.map((agent) => (
                    <tr key={agent.agentId} className="border-t border-border">
                      <td className="p-3 font-medium capitalize">{agent.role}</td>
                      <td className="p-3 text-right tabular-nums">{agent.stats.totalRuns}</td>
                      <td className={`p-3 text-right tabular-nums ${scoreColor(agent.stats.averageScore)}`}>
                        {agent.stats.averageScore}
                      </td>
                      <td className="p-3 text-right tabular-nums text-success">{agent.stats.rewardCount}</td>
                      <td className="p-3 text-right tabular-nums text-warning">{agent.stats.correctionCount}</td>
                      <td className="p-3 text-right tabular-nums text-danger">{agent.stats.failureCount}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {bandIcon(agent.stats.lastBand)}
                          <span className="tabular-nums">{agent.stats.lastScore}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 rounded-lg border border-border bg-surface text-center text-muted">
              No agent runs scored yet. Performance data will appear after agents complete tasks.
            </div>
          )}
        </>
      )}

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
