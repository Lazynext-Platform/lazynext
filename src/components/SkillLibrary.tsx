'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Search, Loader2, AlertCircle, X, Play, Link2, Zap, CheckCircle2,
  Anchor, Lightbulb, Film, Clapperboard, Image, Music, Share2, Target,
  BarChart3, Gauge, Sparkles, ChevronRight,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

// ── Types (mirror src/lib/creative/skill-library.ts) ──

type SkillCategory =
  | 'hook' | 'angle' | 'script' | 'storyboard' | 'visual' | 'audio'
  | 'platform' | 'strategy' | 'analysis' | 'optimization';

type SkillComplexity = 'basic' | 'intermediate' | 'advanced';

interface SkillInput {
  name: string;
  type: 'text' | 'url' | 'image' | 'video' | 'json' | 'select';
  required: boolean;
  description: string;
  options?: string[];
}

interface SkillOutput {
  name: string;
  type: 'text' | 'json' | 'image' | 'video';
  description: string;
}

interface CreativeSkill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  complexity: SkillComplexity;
  inputs: SkillInput[];
  outputs: SkillOutput[];
  estimatedCredits: number;
  tags: string[];
}

interface SkillChainStep {
  skillId: string;
  inputMappings: Record<string, string>;
  outputKey: string;
}

interface SkillChain {
  id: string;
  name: string;
  description: string;
  steps: SkillChainStep[];
  totalCredits: number;
}

interface SkillExecutionResult {
  skillId: string;
  outputs: Record<string, unknown>;
  creditsUsed: number;
  duration: number;
}

// ── Category metadata ──

const CATEGORIES: Array<{ value: SkillCategory | ''; icon: typeof Sparkles; label: string }> = [
  { value: '', icon: Sparkles, label: 'All' },
  { value: 'hook', icon: Anchor, label: 'Hook' },
  { value: 'angle', icon: Lightbulb, label: 'Angle' },
  { value: 'script', icon: Film, label: 'Script' },
  { value: 'storyboard', icon: Clapperboard, label: 'Storyboard' },
  { value: 'visual', icon: Image, label: 'Visual' },
  { value: 'audio', icon: Music, label: 'Audio' },
  { value: 'platform', icon: Share2, label: 'Platform' },
  { value: 'strategy', icon: Target, label: 'Strategy' },
  { value: 'analysis', icon: BarChart3, label: 'Analysis' },
  { value: 'optimization', icon: Gauge, label: 'Optimization' },
];

const COMPLEXITY_STYLES: Record<SkillComplexity, string> = {
  basic: 'bg-emerald-500/15 text-emerald-400',
  intermediate: 'bg-amber-500/15 text-amber-400',
  advanced: 'bg-rose-500/15 text-rose-400',
};

const CATEGORY_ICON: Record<SkillCategory, typeof Sparkles> = {
  hook: Anchor,
  angle: Lightbulb,
  script: Film,
  storyboard: Clapperboard,
  visual: Image,
  audio: Music,
  platform: Share2,
  strategy: Target,
  analysis: BarChart3,
  optimization: Gauge,
};

/**
 * Translation helper: uses the i18n `t` function but falls back to a readable
 * default when the key is missing (returns the key itself). This keeps the UI
 * usable before the i18n message keys are added by the i18n agent.
 */
function useTT() {
  const { t } = useI18n();
  return useCallback((key: string, fallback: string, vars?: Record<string, string | number>) => {
    const s = t(key, vars);
    return s === key ? fallback : s;
  }, [t]);
}

export function SkillLibrary() {
  const { data: session } = useSession();
  const tt = useTT();

  const [skills, setSkills] = useState<CreativeSkill[]>([]);
  const [chains, setChains] = useState<SkillChain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<SkillCategory | ''>('');
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<CreativeSkill | null>(null);
  const [executingChainId, setExecutingChainId] = useState<string | null>(null);
  const [chainProgress, setChainProgress] = useState<{ current: number; total: number } | null>(null);
  const [chainResult, setChainResult] = useState<Record<string, unknown> | null>(null);
  const [chainError, setChainError] = useState('');

  // ── Load skills + chains ──
  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/creative/skills/list');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json().catch(() => ({}));
      setSkills(j.skills || []);
      setChains(j.chains || []);
    } catch {
      setError(tt('skills.errFailed', 'Failed to load skills.'));
    } finally {
      setLoading(false);
    }
  }, [session?.user, tt]);

  useEffect(() => {
    if (session?.user) load();
  }, [session?.user, load]);

  // ── Filtered skills (client-side search + category) ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return skills.filter((s) => {
      if (category && s.category !== category) return false;
      if (!q) return true;
      return [s.id, s.name, s.description, ...s.tags].join(' ').toLowerCase().includes(q);
    });
  }, [skills, search, category]);

  // ── Execute a single skill ──
  const [executing, setExecuting] = useState(false);
  const [skillResult, setSkillResult] = useState<SkillExecutionResult | null>(null);
  const [skillError, setSkillError] = useState('');
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const openSkill = useCallback((skill: CreativeSkill) => {
    setSelectedSkill(skill);
    setSkillResult(null);
    setSkillError('');
    const init: Record<string, string> = {};
    for (const inp of skill.inputs) init[inp.name] = '';
    setFormValues(init);
  }, []);

  const executeSkillAction = useCallback(async () => {
    if (!selectedSkill) return;
    setExecuting(true);
    setSkillError('');
    setSkillResult(null);
    try {
      const res = await fetch('/api/creative/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: selectedSkill.id, inputs: formValues }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error === 'insufficient_credits'
          ? tt('skills.errInsufficient', 'Insufficient credits.')
          : j.detail || j.error || `HTTP ${res.status}`);
      }
      setSkillResult(j.result);
    } catch (e) {
      setSkillError(e instanceof Error ? e.message : String(e));
    } finally {
      setExecuting(false);
    }
  }, [selectedSkill, formValues, tt]);

  // ── Execute a chain ──
  const [chainInputs, setChainInputs] = useState<Record<string, string>>({});

  const executeChainAction = useCallback(async (chain: SkillChain) => {
    setExecutingChainId(chain.id);
    setChainError('');
    setChainResult(null);
    setChainProgress({ current: 0, total: chain.steps.length });
    try {
      const res = await fetch('/api/creative/skills/chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId: chain.id, inputs: chainInputs }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error === 'insufficient_credits'
          ? tt('skills.errInsufficient', 'Insufficient credits.')
          : j.detail || j.error || `HTTP ${res.status}`);
      }
      setChainProgress({ current: chain.steps.length, total: chain.steps.length });
      setChainResult(j.finalOutput);
    } catch (e) {
      setChainError(e instanceof Error ? e.message : String(e));
    } finally {
      setExecutingChainId(null);
    }
  }, [chainInputs, tt]);

  const skillById = useCallback((id: string) => skills.find((s) => s.id === id), [skills]);

  return (
    <div className="space-y-8">
      {/* ── Search + category filters ── */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-faint" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tt('skills.searchPlaceholder', 'Search skills…')}
            className="w-full rounded-lg border border-line bg-app px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b2fc]"
            aria-label={tt('skills.searchPlaceholder', 'Search skills')}
          />
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={tt('skills.categories', 'Skill categories')}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = category === cat.value;
            return (
              <button
                key={cat.value || 'all'}
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(cat.value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'bg-[#00b2fc]/15 text-[#00b2fc]'
                    : 'text-fg-faint hover:bg-hover hover:text-fg'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="inline w-4 h-4 mr-1.5" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div role="status" className="flex items-center gap-2 text-fg-faint">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          <span className="text-sm">{tt('common.loading', 'Loading…')}</span>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-fg-faint">{tt('skills.noResults', 'No skills found.')}</p>
      )}

      {/* ── Skill cards grid ── */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((skill) => {
            const Icon = CATEGORY_ICON[skill.category] || Sparkles;
            return (
              <button
                key={skill.id}
                onClick={() => openSkill(skill)}
                className="group flex flex-col rounded-xl border border-line bg-app p-4 text-left transition hover:border-[#00b2fc]/40 hover:bg-hover focus:outline-none focus:ring-2 focus:ring-[#00b2fc]"
                aria-label={`${skill.name} — ${skill.description}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 shrink-0 text-[#00b2fc]" aria-hidden="true" />
                    <h3 className="text-sm font-semibold truncate">{skill.name}</h3>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${COMPLEXITY_STYLES[skill.complexity]}`}>
                    {skill.complexity}
                  </span>
                </div>
                <p className="text-xs text-fg-faint mb-3 line-clamp-2 flex-1">{skill.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {skill.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] rounded-full bg-hover px-2 py-0.5 text-fg-faint">#{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-line">
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-400">
                    <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                    {skill.estimatedCredits} {tt('skills.credits', 'credits')}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#00b2fc] opacity-0 group-hover:opacity-100 transition">
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    {tt('skills.run', 'Run')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Chains section ── */}
      {!loading && chains.length > 0 && (
        <section aria-labelledby="chains-heading" className="space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#00b2fc]" aria-hidden="true" />
            <h2 id="chains-heading" className="text-lg font-bold">{tt('skills.chainsTitle', 'Skill Chains')}</h2>
          </div>
          <p className="text-sm text-fg-faint">{tt('skills.chainsSubtitle', 'Pre-built multi-step creative workflows.')}</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {chains.map((chain) => {
              const isRunning = executingChainId === chain.id;
              return (
                <div key={chain.id} className="rounded-xl border border-line bg-app p-4 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold truncate">{chain.name}</h3>
                      <p className="text-xs text-fg-faint mt-0.5">{chain.description}</p>
                    </div>
                    <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-amber-400">
                      <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                      {chain.totalCredits}
                    </span>
                  </div>

                  {/* Chain visualization: step-by-step flow */}
                  <ol className="my-3 space-y-1.5" aria-label={tt('skills.chainSteps', 'Chain steps')}>
                    {chain.steps.map((step, idx) => {
                      const s = skillById(step.skillId);
                      const StepIcon = s ? CATEGORY_ICON[s.category] : Sparkles;
                      const done = chainProgress && isRunning && idx < chainProgress.current;
                      return (
                        <li key={idx} className="flex items-center gap-2 text-xs">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            done ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400' : 'border-line text-fg-faint'
                          }`}>
                            {done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <StepIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                          </span>
                          <span className="truncate">{s ? s.name : step.skillId}</span>
                          {idx < chain.steps.length - 1 && <ChevronRight className="ml-auto h-3.5 w-3.5 text-fg-faint" aria-hidden="true" />}
                        </li>
                      );
                    })}
                  </ol>

                  {/* Chain inputs (free-text; mapped server-side) */}
                  <details className="mb-3">
                    <summary className="cursor-pointer text-xs text-fg-faint hover:text-fg">
                      {tt('skills.chainInputs', 'Chain inputs')}
                    </summary>
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={chainInputs['product'] || ''}
                        onChange={(e) => setChainInputs((p) => ({ ...p, product: e.target.value }))}
                        placeholder={tt('skills.phProduct', 'product')}
                        className="w-full rounded-lg border border-line bg-app px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#00b2fc]"
                        aria-label="product"
                      />
                      <input
                        type="text"
                        value={chainInputs['audience'] || ''}
                        onChange={(e) => setChainInputs((p) => ({ ...p, audience: e.target.value }))}
                        placeholder={tt('skills.phAudience', 'audience')}
                        className="w-full rounded-lg border border-line bg-app px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#00b2fc]"
                        aria-label="audience"
                      />
                      <input
                        type="text"
                        value={chainInputs['platform'] || ''}
                        onChange={(e) => setChainInputs((p) => ({ ...p, platform: e.target.value }))}
                        placeholder={tt('skills.phPlatform', 'platform')}
                        className="w-full rounded-lg border border-line bg-app px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#00b2fc]"
                        aria-label="platform"
                      />
                    </div>
                  </details>

                  {isRunning && chainProgress && (
                    <div role="status" className="mb-3">
                      <div className="flex items-center gap-2 text-xs text-fg-faint mb-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        {tt('skills.chainProgress', 'Step {current} of {total}', chainProgress)}
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-hover overflow-hidden">
                        <div
                          className="h-full bg-[#00b2fc] transition-all"
                          style={{ width: `${(chainProgress.current / chainProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {chainError && executingChainId === null && chainResult === null && (
                    <div role="alert" className="mb-3 rounded-lg border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
                      {chainError}
                    </div>
                  )}

                  {chainResult && (
                    <div role="status" className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {tt('skills.chainDone', 'Chain complete.')}
                    </div>
                  )}

                  <button
                    onClick={() => executeChainAction(chain)}
                    disabled={isRunning}
                    className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-[#00b2fc] px-3 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
                    {tt('skills.runChain', 'Run Chain')}
                  </button>
                </div>
              );
            })}
          </div>

          {chainResult && (
            <details className="rounded-lg border border-line bg-app p-3">
              <summary className="cursor-pointer text-sm font-medium">{tt('skills.chainOutput', 'Chain output')}</summary>
              <pre className="mt-2 text-xs bg-hover rounded-lg p-3 overflow-auto max-h-80">
                {JSON.stringify(chainResult, null, 2)}
              </pre>
            </details>
          )}
        </section>
      )}

      {/* ── Skill execution modal ── */}
      {selectedSkill && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedSkill.name}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !executing && setSelectedSkill(null)}
        >
          <div
            className="rounded-xl bg-app border border-line max-w-2xl w-full max-h-[85vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">{selectedSkill.name}</h2>
                <p className="text-sm text-fg-faint">{selectedSkill.description}</p>
              </div>
              <button
                onClick={() => !executing && setSelectedSkill(null)}
                className="shrink-0 ml-2 text-fg-faint hover:text-fg disabled:opacity-50"
                aria-label={tt('common.close', 'Close')}
                disabled={executing}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dynamic form */}
            <div className="space-y-3 mb-4">
              {selectedSkill.inputs.map((inp) => (
                <div key={inp.name}>
                  <label className="block text-xs font-medium mb-1" htmlFor={`skill-input-${inp.name}`}>
                    {inp.name} {inp.required && <span className="text-danger">*</span>}
                    <span className="font-normal text-fg-faint"> — {inp.description}</span>
                  </label>
                  {inp.type === 'select' && inp.options ? (
                    <select
                      id={`skill-input-${inp.name}`}
                      value={formValues[inp.name] || ''}
                      onChange={(e) => setFormValues((p) => ({ ...p, [inp.name]: e.target.value }))}
                      className="w-full rounded-lg border border-line bg-app px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b2fc]"
                    >
                      <option value="">—</option>
                      {inp.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : inp.type === 'json' ? (
                    <textarea
                      id={`skill-input-${inp.name}`}
                      value={formValues[inp.name] || ''}
                      onChange={(e) => setFormValues((p) => ({ ...p, [inp.name]: e.target.value }))}
                      placeholder={inp.type === 'json' ? '{ "…": "…" }' : ''}
                      rows={4}
                      className="w-full rounded-lg border border-line bg-app px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00b2fc]"
                    />
                  ) : (
                    <input
                      id={`skill-input-${inp.name}`}
                      type={inp.type === 'url' ? 'url' : 'text'}
                      value={formValues[inp.name] || ''}
                      onChange={(e) => setFormValues((p) => ({ ...p, [inp.name]: e.target.value }))}
                      className="w-full rounded-lg border border-line bg-app px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b2fc]"
                    />
                  )}
                </div>
              ))}
            </div>

            {skillError && (
              <div role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                <AlertCircle className="inline w-4 h-4 mr-1.5" aria-hidden="true" />
                {skillError}
              </div>
            )}

            {skillResult && (
              <div className="mb-4">
                <div role="status" className="mb-2 flex items-center gap-1.5 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {tt('skills.done', 'Done')} · {skillResult.creditsUsed} {tt('skills.credits', 'credits')} · {skillResult.duration}ms
                </div>
                <pre className="text-xs bg-hover rounded-lg p-3 overflow-auto max-h-60">
                  {JSON.stringify(skillResult.outputs, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-xs font-medium text-amber-400">
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                {selectedSkill.estimatedCredits} {tt('skills.credits', 'credits')}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSkill(null)}
                  disabled={executing}
                  className="px-3 py-2 rounded-lg border border-line text-fg text-sm hover:bg-hover disabled:opacity-50"
                >
                  {tt('common.close', 'Close')}
                </button>
                <button
                  onClick={executeSkillAction}
                  disabled={executing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00b2fc] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {executing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                  {tt('skills.execute', 'Execute')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
