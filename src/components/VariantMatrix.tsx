'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Grid3x3,
  Loader2,
  AlertCircle,
  Trophy,
  BarChart3,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import {
  getAdFormats,
  MATRIX_MAX_CELLS,
  MATRIX_COST_PER_CELL,
  type AdFormat,
  type MatrixCell,
  type MatrixCellStatus,
  type VariantMatrix,
  type MatrixResult,
  type WinningCombination,
  type MatrixInsight,
  type DimensionAnalysis,
} from '@/lib/creative/variant-matrix';

const ALL_FORMATS = getAdFormats();

const STATUS_COLORS: Record<MatrixCellStatus, string> = {
  winning: 'bg-green-500/20 border-green-500 text-green-300',
  tested: 'bg-blue-500/20 border-blue-500 text-blue-300',
  generated: 'bg-yellow-500/20 border-yellow-500 text-yellow-300',
  untested: 'bg-gray-500/10 border-gray-600 text-gray-400',
  underperforming: 'bg-red-500/20 border-red-500 text-red-300',
};

const STATUS_LABELS: Record<MatrixCellStatus, string> = {
  winning: 'Winning',
  tested: 'Tested',
  generated: 'Generated',
  untested: 'Untested',
  underperforming: 'Underperforming',
};

type SortKey = 'score' | 'roas' | 'ctr' | 'conversions';

export function VariantMatrix() {
  const { t } = useI18n();

  // Configuration state
  const [name, setName] = useState('');
  const [hooksText, setHooksText] = useState('');
  const [anglesText, setAnglesText] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<AdFormat[]>(['video_vertical']);
  const [platformsText, setPlatformsText] = useState('tiktok, instagram');
  const [tonesText, setTonesText] = useState('');
  const [ctasText, setCtasText] = useState('');

  // Matrix + analysis state
  const [matrix, setMatrix] = useState<VariantMatrix | null>(null);
  const [result, setResult] = useState<MatrixResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);

  // View + filter state
  const [view, setView] = useState<'config' | 'matrix' | 'analysis'>('config');
  const [filterDim, setFilterDim] = useState<string>('');
  const [filterVal, setFilterVal] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('score');

  const parseList = (s: string): string[] =>
    s
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean);

  const hooks = useMemo(() => parseList(hooksText), [hooksText]);
  const angles = useMemo(() => parseList(anglesText), [anglesText]);
  const platforms = useMemo(() => parseList(platformsText), [platformsText]);
  const tones = useMemo(() => parseList(tonesText), [tonesText]);
  const ctas = useMemo(() => parseList(ctasText), [ctasText]);

  const totalCells = useMemo(() => {
    const tonesFactor = tones.length || 1;
    const ctasFactor = ctas.length || 1;
    return hooks.length * angles.length * selectedFormats.length * platforms.length * tonesFactor * ctasFactor;
  }, [hooks, angles, selectedFormats, platforms, tones, ctas]);

  const cost = totalCells * MATRIX_COST_PER_CELL;
  const overLimit = totalCells > MATRIX_MAX_CELLS;

  const toggleFormat = (f: AdFormat) => {
    setSelectedFormats((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const createMatrix = useCallback(async () => {
    if (!name.trim() || hooks.length < 2 || angles.length < 2 || selectedFormats.length < 1 || platforms.length < 1) return;
    if (overLimit) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/variant-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          hooks,
          angles,
          formats: selectedFormats,
          platforms,
          tones: tones.length ? tones : undefined,
          ctas: ctas.length ? ctas : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details?.join(', ') || 'Failed');
      setMatrix(data.matrix);
      setView('matrix');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [name, hooks, angles, selectedFormats, platforms, tones, ctas, overLimit]);

  const analyze = useCallback(async () => {
    if (!matrix) return;
    setAnalyzing(true);
    setError('');
    try {
      const res = await fetch('/api/creative/variant-matrix/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matrix }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
      setView('analysis');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  }, [matrix]);

  const filteredCells = useMemo(() => {
    if (!matrix) return [];
    let cells = matrix.cells;
    if (filterDim && filterVal) {
      cells = cells.filter((c) => c.coordinates[filterDim as keyof typeof c.coordinates] === filterVal);
    }
    const score = (c: MatrixCell) => c.score ?? 0;
    const perf = (c: MatrixCell) => c.performance;
    cells = [...cells].sort((a, b) => {
      switch (sortKey) {
        case 'roas':
          return (perf(b)?.roas ?? 0) - (perf(a)?.roas ?? 0);
        case 'ctr':
          return (perf(b)?.ctr ?? 0) - (perf(a)?.ctr ?? 0);
        case 'conversions':
          return (perf(b)?.conversions ?? 0) - (perf(a)?.conversions ?? 0);
        default:
          return score(b) - score(a);
      }
    });
    return cells;
  }, [matrix, filterDim, filterVal, sortKey]);

  const canCreate =
    name.trim() && hooks.length >= 2 && angles.length >= 2 && selectedFormats.length >= 1 && platforms.length >= 1 && !overLimit;

  return (
    <div className="space-y-6">
      {/* View tabs */}
      <div role="tablist" aria-label="Variant matrix views" className="flex items-center gap-1 rounded-lg border border-line bg-bg-card p-1">
        {(['config', 'matrix', 'analysis'] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            disabled={v !== 'config' && !matrix}
            onClick={() => setView(v)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
              view === v ? 'bg-[#00b2fc]/15 text-[#00b2fc]' : 'text-fg-faint hover:bg-hover hover:text-fg'
            }`}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            {v === 'config' ? 'Configure' : v === 'matrix' ? 'Matrix' : 'Analysis'}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Configuration view */}
      {view === 'config' && (
        <section aria-labelledby="config-heading" className="space-y-4 rounded-xl border border-line bg-bg-card p-4">
          <h2 id="config-heading" className="text-lg font-semibold flex items-center gap-2">
            <Grid3x3 className="w-5 h-5" /> {t('variantMatrix.title')}
          </h2>
          <p className="text-sm text-fg-muted">{t('variantMatrix.description')}</p>

          <div>
            <label htmlFor="vm-name" className="block text-sm font-medium mb-1">Matrix name</label>
            <input
              id="vm-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('variantMatrix.phMatrixName')}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b2fc]"
              disabled={loading}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="vm-hooks" className="block text-sm font-medium mb-1">Hooks (comma-separated)</label>
              <textarea
                id="vm-hooks"
                value={hooksText}
                onChange={(e) => setHooksText(e.target.value)}
                rows={3}
                placeholder={t('variantMatrix.phHooks')}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b2fc]"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-fg-faint">{hooks.length} hooks</p>
            </div>
            <div>
              <label htmlFor="vm-angles" className="block text-sm font-medium mb-1">Angles (comma-separated)</label>
              <textarea
                id="vm-angles"
                value={anglesText}
                onChange={(e) => setAnglesText(e.target.value)}
                rows={3}
                placeholder={t('variantMatrix.phAngles')}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b2fc]"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-fg-faint">{angles.length} angles</p>
            </div>
          </div>

          <fieldset>
            <legend className="block text-sm font-medium mb-2">Ad formats</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ALL_FORMATS.map((f) => (
                <label
                  key={f.format}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                    selectedFormats.includes(f.format)
                      ? 'border-[#00b2fc] bg-[#00b2fc]/10 text-[#00b2fc]'
                      : 'border-line text-fg-faint hover:bg-hover'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFormats.includes(f.format)}
                    onChange={() => toggleFormat(f.format)}
                    className="sr-only"
                    disabled={loading}
                  />
                  {selectedFormats.includes(f.format) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5 opacity-40" />}
                  {f.name}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="vm-platforms" className="block text-sm font-medium mb-1">Platforms (comma-separated)</label>
              <input
                id="vm-platforms"
                type="text"
                value={platformsText}
                onChange={(e) => setPlatformsText(e.target.value)}
                placeholder={t('variantMatrix.phPlatforms')}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b2fc]"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-fg-faint">{platforms.length} platforms</p>
            </div>
            <div>
              <label htmlFor="vm-tones" className="block text-sm font-medium mb-1">Tones (optional)</label>
              <input
                id="vm-tones"
                type="text"
                value={tonesText}
                onChange={(e) => setTonesText(e.target.value)}
                placeholder={t('variantMatrix.phTones')}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b2fc]"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-fg-faint">{tones.length} tones</p>
            </div>
          </div>

          <div>
            <label htmlFor="vm-ctas" className="block text-sm font-medium mb-1">CTAs (optional)</label>
            <input
              id="vm-ctas"
              type="text"
              value={ctasText}
              onChange={(e) => setCtasText(e.target.value)}
              placeholder={t('variantMatrix.phCtas')}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b2fc]"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-fg-faint">{ctas.length} CTAs</p>
          </div>

          {/* Summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-bg/50 px-3 py-2.5">
            <div className="flex items-center gap-4 text-sm">
              <span className={overLimit ? 'text-red-400 font-semibold' : 'text-fg'}>
                Total cells: <strong>{totalCells}</strong>
              </span>
              <span className="text-fg-muted">Cost: <strong>{cost}</strong> credits</span>
            </div>
            {overLimit && (
              <span role="alert" className="text-xs text-red-400">
                Exceeds max of {MATRIX_MAX_CELLS} cells — reduce axes.
              </span>
            )}
          </div>

          <button
            onClick={createMatrix}
            disabled={!canCreate || loading}
            className="flex items-center gap-2 rounded-lg bg-[#00b2fc] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00b2fc]/90 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Grid3x3 className="h-4 w-4" />}
            Create Matrix
          </button>
        </section>
      )}

      {/* Matrix view */}
      {view === 'matrix' && matrix && (
        <section aria-labelledby="matrix-heading" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="matrix-heading" className="text-lg font-semibold flex items-center gap-2">
              <Grid3x3 className="w-5 h-5" /> {matrix.name}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={analyze}
                disabled={analyzing}
                className="flex items-center gap-1.5 rounded-lg border border-[#00b2fc] px-3 py-1.5 text-xs font-medium text-[#00b2fc] transition hover:bg-[#00b2fc]/10 disabled:opacity-40"
              >
                {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
                Analyze
              </button>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Total', value: matrix.totalCells },
              { label: 'Generated', value: matrix.generatedCells },
              { label: 'Tested', value: matrix.testedCells },
              { label: 'Winning', value: matrix.winningCells },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-line bg-bg-card px-3 py-2 text-center">
                <div className="text-lg font-bold">{s.value}</div>
                <div className="text-xs text-fg-faint">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters + sort */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-bg-card p-2">
            <Filter className="h-4 w-4 text-fg-faint" />
            <label htmlFor="vm-filter-dim" className="sr-only">Filter dimension</label>
            <select
              id="vm-filter-dim"
              value={filterDim}
              onChange={(e) => {
                setFilterDim(e.target.value);
                setFilterVal('');
              }}
              className="rounded-md border border-border bg-bg px-2 py-1 text-xs"
            >
              <option value="">All dimensions</option>
              {matrix.axes.map((a) => (
                <option key={a.dimension} value={a.dimension}>{a.dimension}</option>
              ))}
            </select>
            {filterDim && (
              <>
                <label htmlFor="vm-filter-val" className="sr-only">Filter value</label>
                <select
                  id="vm-filter-val"
                  value={filterVal}
                  onChange={(e) => setFilterVal(e.target.value)}
                  className="rounded-md border border-border bg-bg px-2 py-1 text-xs"
                >
                  <option value="">All values</option>
                  {matrix.axes.find((a) => a.dimension === filterDim)?.values.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <ArrowUpDown className="h-4 w-4 text-fg-faint" />
              <label htmlFor="vm-sort" className="sr-only">Sort by</label>
              <select
                id="vm-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-md border border-border bg-bg px-2 py-1 text-xs"
              >
                <option value="score">Score</option>
                <option value="roas">ROAS</option>
                <option value="ctr">CTR</option>
                <option value="conversions">Conversions</option>
              </select>
            </div>
          </div>

          {/* Cells grid */}
          <div role="table" aria-label="Matrix cells" className="overflow-x-auto">
            <div className="grid min-w-[640px] grid-cols-[2fr_1fr_1fr_1fr_0.8fr_0.8fr] gap-px rounded-lg border border-line bg-line text-xs">
              <div role="columnheader" className="bg-bg-card px-2 py-1.5 font-semibold">Hook</div>
              <div role="columnheader" className="bg-bg-card px-2 py-1.5 font-semibold">Angle</div>
              <div role="columnheader" className="bg-bg-card px-2 py-1.5 font-semibold">Format</div>
              <div role="columnheader" className="bg-bg-card px-2 py-1.5 font-semibold">Platform</div>
              <div role="columnheader" className="bg-bg-card px-2 py-1.5 font-semibold">Status</div>
              <div role="columnheader" className="bg-bg-card px-2 py-1.5 font-semibold">Score</div>
              {filteredCells.map((c) => (
                <button
                  key={c.cellId}
                  role="cell"
                  onClick={() => setSelectedCell(c)}
                  className={`col-span-6 grid grid-cols-[2fr_1fr_1fr_1fr_0.8fr_0.8fr] items-center gap-px text-left transition hover:bg-hover ${STATUS_COLORS[c.status]} border-l-2`}
                >
                  <span className="truncate px-2 py-1.5">{c.hook}</span>
                  <span className="truncate px-2 py-1.5">{c.angle}</span>
                  <span className="truncate px-2 py-1.5">{c.format}</span>
                  <span className="truncate px-2 py-1.5">{c.platform}</span>
                  <span className="px-2 py-1.5">{STATUS_LABELS[c.status]}</span>
                  <span className="px-2 py-1.5 font-semibold">{c.score ?? '—'}</span>
                </button>
              ))}
            </div>
          </div>

          {filteredCells.length === 0 && (
            <p className="py-8 text-center text-sm text-fg-faint">No cells match the current filter.</p>
          )}

          {/* Cell detail modal */}
          {selectedCell && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Cell details"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={() => setSelectedCell(null)}
            >
              <div
                className="w-full max-w-lg space-y-3 rounded-xl border border-line bg-bg-card p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Cell details</h3>
                  <button onClick={() => setSelectedCell(null)} aria-label="Close" className="rounded-md p-1 text-fg-faint hover:bg-hover">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-fg-faint">Hook</dt><dd>{selectedCell.hook}</dd>
                  <dt className="text-fg-faint">Angle</dt><dd>{selectedCell.angle}</dd>
                  <dt className="text-fg-faint">Format</dt><dd>{selectedCell.format}</dd>
                  <dt className="text-fg-faint">Platform</dt><dd>{selectedCell.platform}</dd>
                  <dt className="text-fg-faint">Tone</dt><dd>{selectedCell.tone || '—'}</dd>
                  <dt className="text-fg-faint">CTA</dt><dd>{selectedCell.cta || '—'}</dd>
                  <dt className="text-fg-faint">Status</dt><dd>{STATUS_LABELS[selectedCell.status]}</dd>
                  <dt className="text-fg-faint">Score</dt><dd className="font-semibold">{selectedCell.score ?? '—'}</dd>
                </dl>
                {selectedCell.content && (
                  <div>
                    <p className="text-xs font-medium text-fg-faint">Content</p>
                    <p className="mt-1 text-sm">{selectedCell.content}</p>
                  </div>
                )}
                {selectedCell.performance && (
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-bg/50 p-3 text-sm sm:grid-cols-4">
                    {[
                      { l: 'Impressions', v: selectedCell.performance.impressions.toLocaleString() },
                      { l: 'Clicks', v: selectedCell.performance.clicks.toLocaleString() },
                      { l: 'Conversions', v: selectedCell.performance.conversions.toLocaleString() },
                      { l: 'CTR', v: `${(selectedCell.performance.ctr * 100).toFixed(2)}%` },
                      { l: 'CVR', v: `${(selectedCell.performance.cvr * 100).toFixed(2)}%` },
                      { l: 'Spend', v: `$${selectedCell.performance.spend.toFixed(2)}` },
                      { l: 'Revenue', v: `$${selectedCell.performance.revenue.toFixed(2)}` },
                      { l: 'ROAS', v: `${selectedCell.performance.roas.toFixed(2)}x` },
                    ].map((m) => (
                      <div key={m.l}>
                        <div className="text-xs text-fg-faint">{m.l}</div>
                        <div className="font-semibold">{m.v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Analysis view */}
      {view === 'analysis' && result && (
        <section aria-labelledby="analysis-heading" className="space-y-6">
          <h2 id="analysis-heading" className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Analysis
          </h2>

          {/* Winning combinations */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5"><Trophy className="h-4 w-4 text-yellow-400" /> Winning combinations</h3>
            {result.winningCombinations.length === 0 ? (
              <p className="text-sm text-fg-faint">No winning combinations yet — test cells and re-analyze.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {result.winningCombinations.map((w) => (
                  <WinningCard key={w.combinationId} combo={w} />
                ))}
              </div>
            )}
          </div>

          {/* Dimension analysis */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-[#00b2fc]" /> Dimension analysis</h3>
            <div className="space-y-3">
              {result.dimensionAnalysis.map((da) => (
                <DimensionBars key={da.dimension} da={da} />
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-yellow-400" /> Insights</h3>
            <ul className="space-y-2">
              {result.insights.map((ins) => (
                <InsightRow key={ins.insightId} insight={ins} />
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Recommendations</h3>
            <ul className="space-y-2">
              {result.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-line bg-bg-card p-3 text-sm">
                  <span
                    className={`mt-0.5 rounded px-1.5 py-0.5 text-xs font-semibold uppercase ${
                      r.priority === 'high' ? 'bg-red-500/20 text-red-300' : r.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {r.priority}
                  </span>
                  <div>
                    <p>{r.recommendation}</p>
                    <p className="mt-0.5 text-xs text-fg-faint">{r.expectedImpact}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Empty state for matrix/analysis without data */}
      {view === 'matrix' && !matrix && (
        <p className="py-12 text-center text-sm text-fg-faint">Create a matrix to see cells here.</p>
      )}
      {view === 'analysis' && !result && (
        <p className="py-12 text-center text-sm text-fg-faint">Run an analysis to see results here.</p>
      )}
    </div>
  );
}

function WinningCard({ combo }: { combo: WinningCombination }) {
  return (
    <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-yellow-300">{combo.pattern}</span>
        <span className="text-xs text-fg-faint">{combo.confidenceScore}% confidence</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div><div className="text-fg-faint">Avg score</div><div className="font-semibold">{combo.avgScore}</div></div>
        <div><div className="text-fg-faint">Avg ROAS</div><div className="font-semibold">{combo.avgRoas.toFixed(2)}x</div></div>
        <div><div className="text-fg-faint">Conversions</div><div className="font-semibold">{combo.totalConversions}</div></div>
      </div>
      <p className="mt-2 text-xs text-fg-muted">{combo.recommendation}</p>
    </div>
  );
}

function DimensionBars({ da }: { da: DimensionAnalysis }) {
  const maxScore = Math.max(...da.values.map((v) => v.avgScore), 1);
  return (
    <div className="rounded-lg border border-line bg-bg-card p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium capitalize">{da.dimension}</span>
        <span className="text-xs text-fg-faint">Best: {da.bestValue} · Worst: {da.worstValue}</span>
      </div>
      <div className="space-y-1.5">
        {da.values.map((v) => (
          <div key={v.value} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 truncate text-fg-faint">{v.value}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-[#00b2fc]"
                style={{ width: `${(v.avgScore / maxScore) * 100}%` }}
                role="progressbar"
                aria-valuenow={Math.round(v.avgScore)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-semibold">{v.avgScore}</span>
            <span className="w-12 shrink-0 text-right text-fg-faint">n={v.sampleSize}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightRow({ insight }: { insight: MatrixInsight }) {
  const icon =
    insight.type === 'opportunity' ? <Lightbulb className="h-4 w-4 text-yellow-400" /> :
    insight.type === 'worst_combination' ? <XCircle className="h-4 w-4 text-red-400" /> :
    <CheckCircle2 className="h-4 w-4 text-green-400" />;
  return (
    <li className="flex items-start gap-2 rounded-lg border border-line bg-bg-card p-3 text-sm">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="font-medium capitalize">{insight.type.replace(/_/g, ' ')}: {insight.value || '—'}</p>
        <p className="mt-0.5 text-fg-muted">{insight.description}</p>
        <p className="mt-0.5 text-xs text-fg-faint">{insight.recommendation}</p>
      </div>
    </li>
  );
}
