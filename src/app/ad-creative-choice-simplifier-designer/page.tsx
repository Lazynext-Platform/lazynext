'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Target,
  FileText,
  GitBranch,
  Brain,
  Plus,
  Trash2,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  ChoiceSimplifierDesignerResult,
  ChoiceOption,
} from '@/lib/creative/ad-creative-choice-simplifier-designer';

const CREDIT_COST = 3;

interface OptionForm {
  name: string;
  description: string;
  price: string;
}

export default function AdCreativeChoiceSimplifierDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [options, setOptions] = useState<OptionForm[]>([
    { name: '', description: '', price: '' },
    { name: '', description: '', price: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ChoiceSimplifierDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const addOption = useCallback(() => {
    setOptions((prev) => [...prev, { name: '', description: '', price: '' }]);
  }, []);

  const removeOption = useCallback((index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateOption = useCallback((index: number, field: keyof OptionForm, value: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt)));
  }, []);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !targetAudience.trim()) return;
    const validOptions = options.filter((o) => o.name.trim() && o.description.trim() && o.price.trim());
    if (validOptions.length < 2) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-choice-simplifier-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          options: validOptions,
          targetAudience,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResult(data.result as ChoiceSimplifierDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, targetAudience, options]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const text = JSON.stringify(result, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [result]);

  const validOptionsCount = options.filter((o) => o.name.trim() && o.description.trim() && o.price.trim()).length;
  const canGenerate = productOrBrand.trim() && targetAudience.trim() && validOptionsCount >= 2 && !loading;

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
          Skip to content
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> Choice Simplifier
          </h1>
          <p className="text-sm text-fg-muted mt-2">Sign in to solve choice overload by recommending the one best option.</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        Skip to content
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> Choice Simplifier
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            Solve choice overload by recommending the one best option for your audience.
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="accsdProduct" className="block text-sm font-medium mb-1">
              Product or Brand
            </label>
            <input
              id="accsdProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand with 3 serum tiers"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="accsdAudience" className="block text-sm font-medium mb-1">
              Target Audience
            </label>
            <input
              id="accsdAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 interested in skincare and wellness"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">Options (min 2)</label>
              <button
                type="button"
                onClick={addOption}
                disabled={loading || options.length >= 20}
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Add Option
              </button>
            </div>
            {options.map((opt, i) => (
              <div key={i} className="rounded-lg border border-border bg-bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-fg-muted">Option {i + 1}</span>
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      disabled={loading}
                      className="text-danger hover:opacity-70 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={opt.name}
                  onChange={(e) => updateOption(i, 'name', e.target.value)}
                  placeholder="Option name (e.g., Starter Serum)"
                  maxLength={500}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  disabled={loading}
                />
                <textarea
                  value={opt.description}
                  onChange={(e) => updateOption(i, 'description', e.target.value)}
                  placeholder="Description (e.g., 10% vitamin C for beginners, gentle formula...)"
                  rows={2}
                  maxLength={2000}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
                  disabled={loading}
                />
                <input
                  type="text"
                  value={opt.price}
                  onChange={(e) => updateOption(i, 'price', e.target.value)}
                  placeholder="Price (e.g., $29)"
                  maxLength={200}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  disabled={loading}
                />
              </div>
            ))}
          </div>

          <button
            onClick={generate}
            disabled={!canGenerate}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating...' : `Generate (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            Add at least 2 options and generate to see your simplification recommendation.
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Simplifying your choices...
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                Dry-run mode: showing sample content. Connect Atlas to generate real recommendations.
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
            </div>

            {/* Recommended Option */}
            <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/10 p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-1">
                <Target className="w-4 h-4 text-brand-accent" /> Recommended Option
              </p>
              <p className="text-lg font-bold text-fg">{result.recommendedOption.name}</p>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">Reason</p>
                <p className="text-sm text-fg">{result.recommendedOption.reason}</p>
              </div>
              {result.recommendedOption.whyNotOthers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-fg-muted mb-1">Why Not the Others</p>
                  <ul className="space-y-1">
                    {result.recommendedOption.whyNotOthers.map((reason, i) => (
                      <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" /> {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Simplification Copy */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1">
                <FileText className="w-4 h-4 text-warning" /> Simplification Copy
              </p>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">Headline</p>
                <p className="text-sm text-fg">{result.simplificationCopy.headline}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">Body</p>
                <p className="text-sm text-fg">{result.simplificationCopy.body}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">CTA</p>
                <p className="text-sm text-fg">{result.simplificationCopy.cta}</p>
              </div>
            </div>

            {/* Decision Tree */}
            {result.decisionTree.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <GitBranch className="w-4 h-4 text-brand-accent" /> Decision Tree
                </p>
                <ul className="space-y-1.5">
                  {result.decisionTree.map((step, i) => (
                    <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                      <span className="text-xs font-bold text-brand-accent flex-shrink-0 mt-0.5">{i + 1}.</span> {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cognitive Load Reduction */}
            {result.cognitiveLoadReduction && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Brain className="w-4 h-4 text-success" /> Cognitive Load Reduction
                </p>
                <p className="text-sm text-fg">{result.cognitiveLoadReduction}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
