'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Atom,
  GitCompare,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  UniqueMechanismDesignerResult,
} from '@/lib/creative/ad-creative-unique-mechanism-designer';

const CREDIT_COST = 4;

export default function AdCreativeUniqueMechanismDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UniqueMechanismDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !productDescription.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-unique-mechanism-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          productDescription,
          targetAudience,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResult(data.result as UniqueMechanismDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, productDescription, targetAudience]);

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
            <Sparkles className="w-6 h-6" /> Unique Mechanism Designer
          </h1>
          <p className="text-sm text-fg-muted mt-2">Sign in to identify and articulate your product&apos;s unique mechanism of action.</p>
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
            <Sparkles className="w-6 h-6" /> Unique Mechanism Designer
          </h1>
          <p className="text-sm text-fg-muted mt-2">
            Identify and articulate the unique mechanism of action behind your product.
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acumdProduct" className="block text-sm font-medium mb-1">
              Product or Brand
            </label>
            <input
              id="acumdProduct"
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
            <label htmlFor="acumdDesc" className="block text-sm font-medium mb-1">
              Product Description
            </label>
            <textarea
              id="acumdDesc"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="e.g., A 15% L-ascorbic acid serum with a patented delivery system that penetrates deeper than standard formulas..."
              rows={4}
              maxLength={4000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acumdAudience" className="block text-sm font-medium mb-1">
              Target Audience
            </label>
            <input
              id="acumdAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women 25-40 interested in skincare and wellness"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || !productDescription.trim() || !targetAudience.trim()}
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
            Fill in the fields above and generate to identify your unique mechanism.
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Identifying your unique mechanism...
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                Dry-run mode: showing sample content. Connect Atlas to generate real content.
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

            {/* Mechanism */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Atom className="w-4 h-4 text-brand-accent" />
                <span className="text-sm font-medium">Unique Mechanism</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-fg-muted mb-0.5">Name</p>
                  <p className="text-sm text-fg font-medium">{result.mechanism.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-fg-muted mb-0.5">Description</p>
                  <p className="text-sm text-fg">{result.mechanism.description}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-fg-muted mb-0.5">Scientific Basis</p>
                  <p className="text-sm text-fg">{result.mechanism.scientificBasis}</p>
                </div>
              </div>
            </div>

            {/* Differentiation Points */}
            {result.differentiationPoints.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <GitCompare className="w-4 h-4 text-success" /> Differentiation Points
                </p>
                <ul className="space-y-1.5">
                  {result.differentiationPoints.map((point, i) => (
                    <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" /> {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ad Copy */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1">
                <FileText className="w-4 h-4 text-warning" /> Ad Copy
              </p>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-0.5">Headline</p>
                <p className="text-sm text-fg">{result.adCopy.headline}</p>
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

            {/* Proof Elements */}
            {result.proofElements.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-brand-accent" /> Proof Elements
                </p>
                <ul className="space-y-1.5">
                  {result.proofElements.map((proof, i) => (
                    <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" /> {proof}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
