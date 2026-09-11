'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, AlertCircle, ScanSearch, Check, Copy } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
import type { DesignSlopReport } from '@/lib/quality/design-rules';

const CREDIT_COST = 2;

export default function DesignAuditPage() {
  const { data: session } = useSession();
  const [markup, setMarkup] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DesignSlopReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const scan = useCallback(async () => {
    if (!markup.trim()) return;
    if (!session?.user) {
      setShowAuth(true);
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/design-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markup, sourceLabel: sourceLabel || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'scan_failed');
        return;
      }
      setResult(data.result.report);
    } catch {
      setError('network_error');
    } finally {
      setLoading(false);
    }
  }, [markup, sourceLabel, session]);

  const copyReport = () => {
    if (!result) return;
    const lines = result.hits.map(h => `${h.source}:${h.line} [${h.id} ${h.name}] "${h.match}" → ${h.fix}`);
    const report = `Design Slop Report\nTotal hits: ${result.totalHits}\nClassic: ${result.byTier.classic}, Evolved: ${result.byTier.evolved}\n\n${lines.join('\n')}`;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanSearch className="w-6 h-6 text-brand-accent" />
          Design Slop Scanner
        </h1>
        <p className="text-muted text-sm mt-1">
          Deterministic visual/UI slop detector. Scans HTML, JSX, and Tailwind source for 35 AI-design tells: indigo-violet gradients, gradient headlines, glassmorphism, emoji spam, glowing dots, and more. No LLM calls — pure regex analysis.
        </p>
        <p className="text-xs text-muted mt-1">Cost: {CREDIT_COST} credits</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Source label (optional)</label>
          <input
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
            placeholder="e.g. Hero.tsx"
            className="w-full p-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            maxLength={100}
          />
        </div>
        <label className="text-sm font-medium">Paste markup or component source</label>
        <textarea
          value={markup}
          onChange={(e) => setMarkup(e.target.value)}
          placeholder={'<div class="bg-gradient-to-r from-indigo-500 to-purple-500 ...">'}
          className="w-full min-h-[200px] p-3 rounded-lg border border-border bg-surface text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-brand-accent"
          maxLength={200000}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">{markup.length} / 200,000 characters</span>
          <button
            onClick={scan}
            disabled={loading || !markup.trim()}
            className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
            {loading ? 'Scanning...' : 'Scan for Slop'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-surface">
            <div>
              <div className="text-lg font-bold">
                {result.totalHits} tell{result.totalHits !== 1 ? 's' : ''} detected
              </div>
              <div className="text-sm text-muted">
                Classic: {result.byTier.classic} / Evolved: {result.byTier.evolved}
              </div>
            </div>
            {result.totalHits > 0 && (
              <button
                onClick={copyReport}
                className="px-3 py-1.5 rounded-lg border border-border text-sm flex items-center gap-1 hover:bg-border"
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          {result.totalHits === 0 ? (
            <div className="p-4 rounded-lg border border-success/30 bg-success/10 text-sm text-success flex items-center gap-2">
              <Check className="w-4 h-4" />
              No visual slop patterns detected. The markup is clean.
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="text-sm font-medium">Hits by tell</h2>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {result.hits.map((hit, i) => (
                  <div key={i} className="p-2 rounded-lg border border-border bg-surface text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-border text-muted shrink-0">
                        {hit.id}
                      </span>
                      <div className="flex-1">
                        <span className="text-xs font-medium">{hit.name}</span>
                        <span className="ml-2 text-xs text-muted">{hit.source}:{hit.line}</span>
                        <div className="mt-1 font-mono text-xs text-foreground bg-border/50 px-2 py-1 rounded">
                          {hit.match}
                        </div>
                        <div className="text-xs text-muted mt-1">{hit.fix}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
