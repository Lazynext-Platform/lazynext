'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  ClipboardList,
  Loader2,
  AlertCircle,
  Sparkles,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Info,
  Target,
  Copy,
  Check,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  BriefAnalyzerResult,
  BriefAnalysis,
  BriefGrade,
  BriefSectionQuality,
  BriefGapImpact,
} from '@/lib/creative/brief-analyzer';

const CREDIT_COST = 4;

const GRADE_COLORS: Record<BriefGrade, string> = {
  'A+': 'bg-success/20 text-success border-success/30',
  A: 'bg-success/20 text-success border-success/30',
  B: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  C: 'bg-warning/20 text-warning border-warning/30',
  D: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  F: 'bg-danger/20 text-danger border-danger/30',
};

const QUALITY_COLORS: Record<BriefSectionQuality, string> = {
  strong: 'bg-success/20 text-success border-success/30',
  adequate: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  weak: 'bg-warning/20 text-warning border-warning/30',
  missing: 'bg-danger/20 text-danger border-danger/30',
};

const QUALITY_ICONS: Record<BriefSectionQuality, typeof CheckCircle2> = {
  strong: CheckCircle2,
  adequate: CheckCircle2,
  weak: AlertTriangle,
  missing: XCircle,
};

const IMPACT_COLORS: Record<BriefGapImpact, string> = {
  high: 'bg-danger/20 text-danger border-danger/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

const INDUSTRIES = [
  'beauty',
  'tech',
  'food',
  'fashion',
  'fitness',
  'home',
  'finance',
  'travel',
  'general',
];

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 65) return 'text-brand-accent';
  if (score >= 45) return 'text-warning';
  return 'text-danger';
}

export default function BriefAnalyzerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [briefText, setBriefText] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BriefAnalyzerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const analyze = useCallback(async () => {
    if (!briefText.trim() || briefText.trim().length < 50) return;
    setLoading(true);
    setError('');
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch('/api/creative/brief-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefText: briefText.trim(),
          industry: industry || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('briefAnalyzer.error'));
      setResult(data.result as BriefAnalyzerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [briefText, industry, t]);

  const copyAnalysis = useCallback(() => {
    if (!result) return;
    const a = result.analysis;
    const lines: string[] = [
      'Creative Brief Analysis',
      '',
      `Overall Score: ${a.overallScore}/100 (Grade: ${a.grade})`,
      '',
      'SECTIONS:',
    ];
    for (const s of a.sections) {
      lines.push(`- ${s.name}: ${s.present ? s.quality : 'missing'}${s.content ? ` — ${s.content}` : ''}`);
    }
    lines.push('', 'GAPS:');
    for (const g of a.gaps) {
      lines.push(`- [${g.impact}] ${g.element} → ${g.recommendation}`);
    }
    lines.push('', 'STRENGTHS:');
    for (const s of a.strengths) lines.push(`- ${s}`);
    lines.push('', 'WEAKNESSES:');
    for (const w of a.weaknesses) lines.push(`- ${w}`);
    lines.push('', 'RECOMMENDATIONS:');
    for (const r of a.recommendations) lines.push(`- ${r}`);
    lines.push('', 'PREDICTED EFFECTIVENESS:');
    lines.push(a.predictedEffectiveness);
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [result]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="skip-link">{t('briefAnalyzer.skipToContent')}</a>
        <main id="main-content" className="mx-auto max-w-5xl px-4 py-16 text-center" tabIndex={-1}>
          <ClipboardList className="mx-auto mb-4 h-10 w-10 text-brand-accent" aria-hidden="true" />
          <h1 className="text-2xl font-bold mb-2">{t('briefAnalyzer.title')}</h1>
          <p className="text-sm text-fg-faint mb-6">{t('briefAnalyzer.signInPrompt')}</p>
        </main>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="skip-link">{t('briefAnalyzer.skipToContent')}</a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6" tabIndex={-1}>
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="w-6 h-6" /> Creative Brief Analyzer</h1>
          <p className="text-sm text-fg-muted mt-2">{t('briefAnalyzer.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="baBrief" className="block text-sm font-medium mb-1">{t('briefAnalyzer.briefText')}</label>
            <textarea
              id="baBrief"
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              placeholder="Paste your creative brief here... (minimum 50 characters)"
              rows={10}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
            <p className="text-xs text-fg-faint mt-1">
              {briefText.trim().length}/50 minimum characters
            </p>
          </div>

          <div>
            <label htmlFor="baIndustry" className="block text-sm font-medium mb-1">{t('briefAnalyzer.industry')}</label>
            <select
              id="baIndustry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            >
              <option value="">— {t('briefAnalyzer.industryOptional')} —</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          <button
            onClick={analyze}
            disabled={loading || briefText.trim().length < 50}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('briefAnalyzer.analyzing') : `${t('briefAnalyzer.analyze')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('briefAnalyzer.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('briefAnalyzer.analyzing')}
          </div>
        )}

        {result && <BriefResults result={result} onCopy={copyAnalysis} copied={copied} t={t} />}
      </main>
    </div>
  );
}

function BriefResults({
  result,
  onCopy,
  copied,
  t,
}: {
  result: BriefAnalyzerResult;
  onCopy: () => void;
  copied: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const a: BriefAnalysis = result.analysis;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onCopy}
          className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs font-medium hover:opacity-80 flex items-center gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t('briefAnalyzer.copied') : t('briefAnalyzer.copy')}
        </button>
      </div>

      {result.dryRun && (
        <div className="rounded-lg bg-brand-accent/10 border border-brand-accent/30 px-3 py-2 text-xs text-brand-accent flex items-center gap-2">
          <Info className="w-4 h-4 flex-shrink-0" /> {t('briefAnalyzer.dryRunNotice')}
        </div>
      )}

      {/* Overall score */}
      <div className="rounded-lg border border-border bg-bg-card p-4">
        <h3 className="font-medium flex items-center gap-2 mb-3"><Gauge className="w-4 h-4" /> {t('briefAnalyzer.overallScore')}</h3>
        <div className="flex items-center gap-4">
          <div className={`text-4xl font-bold ${scoreColor(a.overallScore)}`}>{a.overallScore}</div>
          <div className="space-y-1">
            <span className={`inline-block text-sm font-medium px-2 py-0.5 rounded-full border ${GRADE_COLORS[a.grade]}`}>
              {t('briefAnalyzer.grade')}: {a.grade}
            </span>
          </div>
        </div>
      </div>

      {/* Section-by-section analysis */}
      {a.sections && a.sections.length > 0 && (
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <h3 className="font-medium flex items-center gap-2 mb-3"><ClipboardList className="w-4 h-4" /> {t('briefAnalyzer.sections')}</h3>
          <div className="space-y-3">
            {a.sections.map((s, i) => {
              const Icon = QUALITY_ICONS[s.quality] || XCircle;
              return (
                <div key={i} className="border-l-2 border-border pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${QUALITY_COLORS[s.quality]}`}>
                      {s.present ? s.quality : 'missing'}
                    </span>
                  </div>
                  {s.content && <p className="text-xs text-fg-muted">{s.content}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gaps */}
      {a.gaps && a.gaps.length > 0 && (
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <h3 className="font-medium flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4" /> {t('briefAnalyzer.gaps')}</h3>
          <div className="space-y-3">
            {a.gaps.map((g, i) => (
              <div key={i} className="border-l-2 border-border pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{g.element}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${IMPACT_COLORS[g.impact]}`}>
                    {t(`briefAnalyzer.impact_${g.impact}`)}
                  </span>
                </div>
                <p className="text-xs mt-1"><span className="font-medium">{t('briefAnalyzer.fix')}:</span> {g.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {a.strengths && a.strengths.length > 0 && (
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <h3 className="font-medium flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4" /> {t('briefAnalyzer.strengths')}</h3>
          <ul className="list-disc list-inside text-sm text-fg-muted space-y-1">
            {a.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {a.weaknesses && a.weaknesses.length > 0 && (
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <h3 className="font-medium flex items-center gap-2 mb-3"><XCircle className="w-4 h-4" /> {t('briefAnalyzer.weaknesses')}</h3>
          <ul className="list-disc list-inside text-sm text-fg-muted space-y-1">
            {a.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {a.recommendations && a.recommendations.length > 0 && (
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <h3 className="font-medium flex items-center gap-2 mb-3"><Target className="w-4 h-4" /> {t('briefAnalyzer.recommendations')}</h3>
          <ul className="list-disc list-inside text-sm text-fg-muted space-y-1">
            {a.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {/* Predicted effectiveness */}
      <div className="rounded-lg border border-border bg-bg-card p-4">
        <h3 className="font-medium flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4" /> {t('briefAnalyzer.predictedEffectiveness')}</h3>
        <p className="text-sm text-fg-muted">{a.predictedEffectiveness}</p>
      </div>
    </div>
  );
}
