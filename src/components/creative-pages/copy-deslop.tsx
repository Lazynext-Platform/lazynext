'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, AlertCircle, ScanText, Check, X, Copy } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
import type { CopySlopReport, CopySlopScore } from '@/lib/quality/copy-rules';

const CREDIT_COST = 2;

function scoreColor(s: number): string {
  if (s >= 40) return 'text-success';
  if (s >= 35) return 'text-brand-accent';
  if (s >= 25) return 'text-warning';
  return 'text-danger';
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted">{label}</span>
        <span className={scoreColor(value)}>{value}/10</span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full ${value >= 7 ? 'bg-success' : value >= 4 ? 'bg-brand-accent' : 'bg-danger'}`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

export default function CopyDeslopPage() {
  const { data: session } = useSession();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CopySlopReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const scan = useCallback(async () => {
    if (!text.trim()) return;
    if (!session?.user) {
      setShowAuth(true);
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/copy-deslop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
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
  }, [text, session]);

  const copyReport = () => {
    if (!result) return;
    const lines = result.hits.map(h => `L${h.line} [${h.category}] "${h.match}" → ${h.fix}`);
    const report = `Copy De-Slop Report\nScore: ${result.score.total}/50 (${result.verdict})\n\n${lines.join('\n')}`;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanText className="w-6 h-6 text-brand-accent" />
          Copy De-Slop Scanner
        </h1>
        <p className="text-muted text-sm mt-1">
          Deterministic AI-writing-pattern detector. Scans prose for throat-clearing, emphasis crutches, banned words, structural cliches, and scores on 5 axes. No LLM calls — pure regex analysis.
        </p>
        <p className="text-xs text-muted mt-1">Cost: {CREDIT_COST} credits</p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Paste your copy</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste ad copy, marketing text, email body, or any prose to scan for AI slop patterns..."
          className="w-full min-h-[200px] p-3 rounded-lg border border-border bg-surface text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand-accent"
          maxLength={50000}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">{text.length} / 50,000 characters</span>
          <button
            onClick={scan}
            disabled={loading || !text.trim()}
            className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />}
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
                Score: <span className={scoreColor(result.score.total)}>{result.score.total}/50</span>
              </div>
              <div className="text-sm text-muted">
                Verdict: {result.verdict === 'pass' ? (
                  <span className="text-success flex items-center gap-1"><Check className="w-4 h-4 inline" /> Pass</span>
                ) : (
                  <span className="text-warning flex items-center gap-1"><X className="w-4 h-4 inline" /> Revise</span>
                )}
              </div>
            </div>
            <button
              onClick={copyReport}
              className="px-3 py-1.5 rounded-lg border border-border text-sm flex items-center gap-1 hover:bg-border"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 rounded-lg border border-border bg-surface">
            <ScoreBar label="Directness" value={result.score.directness} />
            <ScoreBar label="Rhythm" value={result.score.rhythm} />
            <ScoreBar label="Trust" value={result.score.trust} />
            <ScoreBar label="Authenticity" value={result.score.authenticity} />
            <ScoreBar label="Density" value={result.score.density} />
          </div>

          {result.hits.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-medium">{result.totalHits} pattern{result.totalHits !== 1 ? 's' : ''} detected</h2>
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {result.hits.map((hit, i) => (
                  <div key={i} className="p-2 rounded-lg border border-border bg-surface text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-muted shrink-0 mt-0.5">L{hit.line}</span>
                      <div className="flex-1">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-border text-muted">{hit.category}</span>
                        <span className="ml-2 text-foreground">&ldquo;{hit.match}&rdquo;</span>
                        <div className="text-xs text-muted mt-1">{hit.fix}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-success/30 bg-success/10 text-sm text-success flex items-center gap-2">
              <Check className="w-4 h-4" />
              No slop patterns detected. The copy is clean.
            </div>
          )}
        </div>
      )}

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
