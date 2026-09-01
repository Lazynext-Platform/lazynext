'use client';

import { useState, useCallback } from 'react';
import { ShieldCheck, Loader2, AlertCircle, AlertTriangle, XCircle, Info, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { ComplianceResult, ComplianceViolation, CompliancePlatform } from '@/lib/creative/compliance';

const PLATFORM_LABELS: Record<CompliancePlatform, string> = {
  tiktok: 'TikTok', youtube: 'YouTube', meta: 'Meta', google: 'Google', universal: 'Universal',
};

const SEVERITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  critical: XCircle, high: AlertCircle, medium: AlertTriangle, low: Info, info: Info,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-danger', high: 'text-warning', medium: 'text-warning', low: 'text-brand-accent', info: 'text-fg-muted',
};

const STATUS_COLORS: Record<string, string> = {
  compliant: 'text-success', warning: 'text-warning', violation: 'text-danger', needs_review: 'text-warning',
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  compliant: CheckCircle2, warning: AlertTriangle, violation: XCircle, needs_review: AlertCircle,
};

export function ComplianceChecker() {
  const { t } = useI18n();
  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState<CompliancePlatform[]>(['universal']);
  const [contentType, setContentType] = useState('ad_copy');
  const [brandName, setBrandName] = useState('');
  const [productClaims, setProductClaims] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ComplianceResult | null>(null);

  const togglePlatform = (p: CompliancePlatform) => {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const check = useCallback(async () => {
    if (!content.trim() || platforms.length === 0) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          platforms,
          contentType,
          brandName: brandName || undefined,
          productClaims: productClaims ? productClaims.split(',').map((c) => c.trim()).filter(Boolean) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, platforms, contentType, brandName, productClaims]);

  const StatusIcon = result ? STATUS_ICONS[result.overallStatus] || AlertCircle : AlertCircle;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> {t('compliance.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('compliance.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-1">{t('compliance.content')} <span className="text-xs text-fg-muted">({content.length}/10000)</span></label>
          <textarea id="content" value={content} onChange={(e) => setContent(e.target.value.slice(0, 10000))} rows={6} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('compliance.platforms')}</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PLATFORM_LABELS) as CompliancePlatform[]).map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={platforms.includes(p)} onChange={() => togglePlatform(p)} disabled={loading} />
                {PLATFORM_LABELS[p]}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="contentType" className="block text-sm font-medium mb-1">{t('compliance.contentType')}</label>
            <select id="contentType" value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
              <option value="ad_copy">Ad Copy</option>
              <option value="video_script">Video Script</option>
              <option value="image_text">Image Text</option>
              <option value="caption">Caption</option>
              <option value="landing_page">Landing Page</option>
            </select>
          </div>
          <div>
            <label htmlFor="brandName" className="block text-sm font-medium mb-1">{t('compliance.brandName')}</label>
            <input id="brandName" type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
        </div>

        <div>
          <label htmlFor="claims" className="block text-sm font-medium mb-1">{t('compliance.productClaims')}</label>
          <input id="claims" type="text" value={productClaims} onChange={(e) => setProductClaims(e.target.value)} placeholder={t('compliance.phProductClaims')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <button onClick={check} disabled={loading || !content.trim() || platforms.length === 0} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {loading ? t('compliance.checking') : `${t('compliance.check')} (4 ${t('compliance.credits')})`}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-bg-card p-4 flex items-center gap-4">
            <StatusIcon className={`w-8 h-8 ${STATUS_COLORS[result.overallStatus] || 'text-fg-muted'}`} />
            <div className="flex-1">
              <div className="text-lg font-bold capitalize">{result.overallStatus.replace('_', ' ')}</div>
              <div className="text-sm text-fg-muted">{t('compliance.complianceScore')}: {result.complianceScore}/100</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-fg-muted">{t('compliance.brandSafety')}</div>
              <div className={`text-lg font-bold ${result.brandSafetyScore >= 80 ? 'text-success' : result.brandSafetyScore >= 60 ? 'text-warning' : 'text-danger'}`}>{result.brandSafetyScore}</div>
            </div>
          </div>

          {result.brandSafetyFlags.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-3">
              <p className="text-xs text-fg-muted mb-1">{t('compliance.brandSafetyFlags')}:</p>
              <div className="flex flex-wrap gap-1">{result.brandSafetyFlags.map((f, i) => <span key={i} className="text-xs bg-warning/10 text-warning rounded px-2 py-0.5">{f}</span>)}</div>
            </div>
          )}

          {result.platforms.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {result.platforms.map((p, i) => {
                const PIcon = STATUS_ICONS[p.status] || AlertCircle;
                return (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-2 text-center">
                    <div className="text-xs font-medium">{PLATFORM_LABELS[p.platform] || p.platform}</div>
                    <PIcon className={`w-4 h-4 mx-auto my-1 ${STATUS_COLORS[p.status] || 'text-fg-muted'}`} />
                    <div className="text-xs text-fg-muted">{p.score}/100</div>
                    <div className="text-xs">{p.violations.length}V {p.warnings.length}W</div>
                  </div>
                );
              })}
            </div>
          )}

          {result.violations.length > 0 && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
              <h3 className="font-medium text-danger mb-3">{t('compliance.violations')}</h3>
              <div className="space-y-2">
                {result.violations.map((v, i) => {
                  const VIcon = SEVERITY_ICONS[v.severity] || AlertCircle;
                  return (
                    <div key={i} className="border-l-2 border-danger/30 pl-3">
                      <div className="flex items-center gap-2">
                        <VIcon className={`w-4 h-4 ${SEVERITY_COLORS[v.severity] || 'text-fg-muted'}`} />
                        <span className="text-sm font-medium">{v.title}</span>
                        <span className="text-xs text-fg-muted capitalize">{v.platform} | {v.category.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-fg-muted mt-1">{v.description}</p>
                      <p className="text-xs bg-danger/10 rounded px-2 py-0.5 mt-1 inline-block">&ldquo;{v.matchedContent}&rdquo;</p>
                      <p className="text-xs mt-1"><span className="font-medium">Fix:</span> {v.recommendation}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <h3 className="font-medium text-warning mb-3">{t('compliance.warnings')}</h3>
              <div className="space-y-2">
                {result.warnings.map((w, i) => {
                  const WIcon = SEVERITY_ICONS[w.severity] || AlertTriangle;
                  return (
                    <div key={i} className="border-l-2 border-warning/30 pl-3">
                      <div className="flex items-center gap-2">
                        <WIcon className={`w-4 h-4 ${SEVERITY_COLORS[w.severity] || 'text-fg-muted'}`} />
                        <span className="text-sm font-medium">{w.title}</span>
                      </div>
                      <p className="text-xs text-fg-muted mt-1">{w.description}</p>
                      <p className="text-xs mt-1">{w.recommendation}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.claimVerification.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('compliance.claimVerification')}</h3>
              <div className="space-y-2">
                {result.claimVerification.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`text-xs uppercase font-medium ${c.status === 'verified' ? 'text-success' : c.status === 'misleading' ? 'text-danger' : 'text-warning'}`}>{c.status.replace('_', ' ')}</span>
                    <span className="text-sm flex-1">&ldquo;{c.claim}&rdquo;</span>
                    <span className="text-xs text-fg-muted">{c.recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-3">{t('compliance.recommendations')}</h3>
              <div className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-3">
                    <span className={`text-xs uppercase font-medium ${r.priority === 'high' ? 'text-danger' : r.priority === 'medium' ? 'text-warning' : 'text-fg-muted'}`}>{r.priority}</span>
                    <div className="flex-1">
                      <p className="text-sm">{r.recommendation}</p>
                      <p className="text-xs text-fg-muted">Platforms: {r.affectedPlatforms.map((p) => PLATFORM_LABELS[p] || p).join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
