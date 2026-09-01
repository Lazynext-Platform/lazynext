'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  GitBranch,
  FileText,
  Lock,
  Star,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  ImplementationIntentionDesignerResult,
  IfThenPlan,
} from '@/lib/creative/ad-creative-implementation-intention-designer';

const CREDIT_COST = 3;

export default function AdCreativeImplementationIntentionDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [desiredAction, setDesiredAction] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImplementationIntentionDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !targetAudience.trim() || !desiredAction.trim() || !context.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-implementation-intention-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          targetAudience,
          desiredAction,
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResult(data.result as ImplementationIntentionDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, targetAudience, desiredAction, context]);

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

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
          Skip to content
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> Implementation-Intention Designer
          </h1>
          <p className="text-sm text-fg-muted mt-2">Sign in to build if-then action plans that turn intent into purchase.</p>
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
            <Sparkles className="w-6 h-6" /> Implementation-Intention Designer
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            Build &quot;if-then&quot; action plans that turn viewer intent into purchase.
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="aciidProduct" className="block text-sm font-medium mb-1">
              Product or Brand
            </label>
            <input
              id="aciidProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="aciidAudience" className="block text-sm font-medium mb-1">
              Target Audience
            </label>
            <input
              id="aciidAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 interested in skincare and wellness"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="aciidAction" className="block text-sm font-medium mb-1">
              Desired Action
            </label>
            <input
              id="aciidAction"
              type="text"
              value={desiredAction}
              onChange={(e) => setDesiredAction(e.target.value)}
              placeholder="e.g., Purchase the vitamin C serum from the website"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="aciidContext" className="block text-sm font-medium mb-1">
              Context
            </label>
            <textarea
              id="aciidContext"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., Viewers are watching a TikTok ad during their evening scroll. They're interested but easily distracted and tend to bookmark things they never return to..."
              rows={4}
              maxLength={4000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || !targetAudience.trim() || !desiredAction.trim() || !context.trim()}
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
            Fill in the fields above and generate to see your if-then plans.
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Building your if-then plans...
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                Dry-run mode: showing sample content. Connect Atlas to generate real plans.
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('implementationIntentionDesigner.copied') : t('implementationIntentionDesigner.copy')}
              </button>
            </div>

            {/* Best Plan */}
            {result.bestPlan && (
              <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/10 p-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-brand-accent flex-shrink-0" />
                <span className="text-sm text-fg">
                  Best plan: <span className="font-medium">{result.bestPlan.replace(/_/g, ' ')}</span>
                </span>
              </div>
            )}

            {/* If-Then Plans */}
            {result.ifThenPlans.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-1">
                  <GitBranch className="w-4 h-4 text-brand-accent" /> If-Then Plans
                </p>
                {result.ifThenPlans.map((plan: IfThenPlan, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">IF (Trigger)</p>
                      <p className="text-sm text-fg">{plan.trigger}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">THEN (Action)</p>
                      <p className="text-sm text-fg">{plan.action}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">Timing</p>
                      <p className="text-sm text-fg">{plan.timing}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-fg-muted mb-0.5">Friction Removal</p>
                      <p className="text-sm text-fg">{plan.frictionRemoval}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ad Copy */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1">
                <FileText className="w-4 h-4 text-warning" /> Ad Copy
              </p>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">Hook</p>
                <p className="text-sm text-fg">{result.adCopy.hook}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">Body</p>
                <p className="text-sm text-fg">{result.adCopy.body}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">CTA</p>
                <p className="text-sm text-fg">{result.adCopy.cta}</p>
              </div>
            </div>

            {/* Commitment Device */}
            {result.commitmentDevice && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Lock className="w-4 h-4 text-success" /> Commitment Device
                </p>
                <p className="text-sm text-fg">{result.commitmentDevice}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
