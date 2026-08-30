'use client';

import { useState, useCallback, useEffect } from 'react';
import { GitBranch, Loader2, AlertCircle, Sparkles, CheckCircle2, Clock, Coins } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface BranchStep {
  condition: {
    type: string;
    stepIndex?: number;
    outputKey?: string;
    value: string | number;
  };
  branchToChainId?: string;
  branchToSkillId?: string;
  label: string;
}

interface EnhancedChainStep {
  skillId: string;
  inputMappings: Record<string, string>;
  outputKey: string;
  branches?: BranchStep[];
}

interface EnhancedChain {
  id: string;
  name: string;
  description: string;
  steps: EnhancedChainStep[];
  inputs: Record<string, string>;
  estimatedCredits: number;
}

interface SkillInfo {
  id: string;
  name: string;
}

interface ChainExecutionResult {
  chainId: string;
  steps: Array<{
    stepIndex: number;
    skillId: string;
    success: boolean;
    outputs: Record<string, unknown>;
    duration: number;
    branchesTaken?: string[];
  }>;
  totalDuration: number;
  totalCreditsUsed: number;
  finalOutputs: Record<string, unknown>;
  branchPaths: string[];
}

export function SkillChainBuilder() {
  const { t } = useI18n();
  const [chains, setChains] = useState<EnhancedChain[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [selectedChain, setSelectedChain] = useState<EnhancedChain | null>(null);
  const [productName, setProductName] = useState('');
  const [audience, setAudience] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [loading, setLoading] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ChainExecutionResult | null>(null);

  // Fetch the chain catalog + skills on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/creative/skill-chain-builder');
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setChains(data.chains || []);
          setSkills(data.skills || []);
        }
      } catch {
        // Catalog load failure is non-fatal — the UI still works with empty state.
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const skillName = useCallback(
    (skillId: string): string => {
      const s = skills.find((sk) => sk.id === skillId);
      return s?.name || skillId;
    },
    [skills],
  );

  const execute = useCallback(async () => {
    if (!selectedChain) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/skill-chain-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: selectedChain.id,
          inputs: { productName, audience, platform },
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
  }, [selectedChain, productName, audience, platform]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <GitBranch className="w-5 h-5" /> {t('skillChains.title')}
        </h2>
        <p className="text-sm text-fg-muted mt-1">{t('skillChains.subtitle')}</p>
      </div>

      {/* Built-in chains */}
      <div>
        <h3 className="font-medium mb-3">{t('skillChains.builtInChains')}</h3>
        {loadingCatalog ? (
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('skillChains.loading')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {chains.map((chain) => {
              const isSelected = selectedChain?.id === chain.id;
              return (
                <button
                  key={chain.id}
                  onClick={() => setSelectedChain(chain)}
                  className={`text-left rounded-lg border p-4 transition-colors ${
                    isSelected
                      ? 'border-brand-accent bg-brand-accent/5'
                      : 'border-border bg-bg-card hover:border-brand-accent/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-medium text-sm">{chain.name}</span>
                    <span className="text-xs text-fg-muted flex items-center gap-1 flex-shrink-0">
                      <Coins className="w-3 h-3" /> {chain.estimatedCredits}
                    </span>
                  </div>
                  <p className="text-xs text-fg-muted mb-2">{chain.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {chain.steps.map((step, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full bg-bg-secondary border border-border"
                      >
                        {i + 1}. {skillName(step.skillId)}
                        {step.branches && step.branches.length > 0 && (
                          <GitBranch className="w-3 h-3 inline ml-1 text-brand-accent" />
                        )}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Chain inputs */}
      {selectedChain && (
        <div className="rounded-lg border border-border bg-bg-card p-4 space-y-4">
          <h3 className="font-medium">{t('skillChains.chainInputs')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="scbProduct" className="block text-sm font-medium mb-1">
                {t('skillChains.productName')}
              </label>
              <input
                id="scbProduct"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Glow Serum by Aura"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="scbAudience" className="block text-sm font-medium mb-1">
                {t('skillChains.audience')}
              </label>
              <input
                id="scbAudience"
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g., Women 25-40"
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="scbPlatform" className="block text-sm font-medium mb-1">
                {t('skillChains.platform')}
              </label>
              <select
                id="scbPlatform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              >
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
                <option value="x">X</option>
              </select>
            </div>
          </div>

          <button
            onClick={execute}
            disabled={loading || !productName.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading
              ? t('skillChains.loading')
              : `${t('skillChains.execute')} (${selectedChain.estimatedCredits} ${t('skillChains.estimatedCredits')})`}
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Execution log */}
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4" /> {t('skillChains.executionLog')}
            </h3>
            <div className="space-y-2">
              {result.steps.map((step, i) => (
                <div key={i} className="border-l-2 border-brand-accent/30 pl-3 py-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-fg-muted">
                      {t('skillChains.step')} {step.stepIndex + 1}
                    </span>
                    <span className="text-sm font-medium">{skillName(step.skillId)}</span>
                    {step.success ? (
                      <span className="text-xs text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {t('skillChains.success')}
                      </span>
                    ) : (
                      <span className="text-xs text-danger flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> failed
                      </span>
                    )}
                    <span className="text-xs text-fg-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {t('skillChains.duration')}: {step.duration}ms
                    </span>
                  </div>
                  {step.branchesTaken && step.branchesTaken.length > 0 && (
                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      <GitBranch className="w-3 h-3 text-brand-accent" />
                      <span className="text-xs text-fg-muted">{t('skillChains.branchesTaken')}:</span>
                      {step.branchesTaken.map((b, bi) => (
                        <span
                          key={bi}
                          className="text-xs px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/30"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border text-xs text-fg-muted flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {t('skillChains.duration')}: {result.totalDuration}ms
              </span>
              <span className="flex items-center gap-1">
                <Coins className="w-3 h-3" /> {result.totalCreditsUsed} {t('skillChains.estimatedCredits')}
              </span>
            </div>
          </div>

          {/* Branch paths visualization */}
          {result.branchPaths.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <GitBranch className="w-4 h-4" /> {t('skillChains.branchPaths')}
              </h3>
              <div className="space-y-2">
                {result.branchPaths.map((path, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm border-l-2 border-brand-accent/40 pl-3"
                  >
                    <GitBranch className="w-3 h-3 text-brand-accent" />
                    <span className="font-mono text-xs">{path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final outputs */}
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <h3 className="font-medium mb-3">{t('skillChains.finalOutputs')}</h3>
            <pre className="text-xs bg-bg-secondary rounded-lg p-3 overflow-x-auto max-h-96">
              {JSON.stringify(result.finalOutputs, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
