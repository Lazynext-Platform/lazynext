/**
 * Creative Variant Matrix
 *
 * Systematic variant generation across hooks × angles × formats × platforms
 * (× tones × ctas) with a matrix view, performance tracking per cell, and
 * identification of winning combinations.
 *
 * A matrix is the cross-product of several "axes" (one per dimension). Each
 * cell is a single creative variant identified by its coordinate along every
 * axis. Cells start untested; as performance data is attached, the matrix is
 * analyzed to surface winning combinations, per-dimension best/worst values,
 * and actionable insights.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MatrixDimension = 'hook' | 'angle' | 'format' | 'platform' | 'tone' | 'cta';

export type AdFormat =
  | 'video_vertical'
  | 'video_horizontal'
  | 'video_square'
  | 'image_single'
  | 'image_carousel'
  | 'story'
  | 'reel'
  | 'short';

export type MatrixCellStatus =
  | 'generated'
  | 'tested'
  | 'winning'
  | 'underperforming'
  | 'untested';

export interface MatrixAxis {
  dimension: MatrixDimension;
  values: string[];
}

export interface MatrixCellPerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  spend: number;
  revenue: number;
  roas: number;
}

export interface MatrixCell {
  cellId: string;
  coordinates: Record<MatrixDimension, string>;
  status: MatrixCellStatus;
  content?: string;
  hook: string;
  angle: string;
  format: AdFormat;
  platform: string;
  tone: string;
  cta: string;
  performance?: MatrixCellPerformance;
  generatedAt?: string;
  testedAt?: string;
  score?: number; // 0-100 composite score
}

export interface VariantMatrix {
  matrixId: string;
  name: string;
  axes: MatrixAxis[];
  cells: MatrixCell[];
  totalCells: number;
  generatedCells: number;
  testedCells: number;
  winningCells: number;
  createdAt: string;
  updatedAt: string;
}

export interface WinningCombination {
  combinationId: string;
  cellIds: string[];
  dimensions: Record<MatrixDimension, string>;
  avgScore: number;
  avgRoas: number;
  totalConversions: number;
  confidenceScore: number;
  pattern: string;
  recommendation: string;
}

export type MatrixInsightType =
  | 'best_hook'
  | 'best_angle'
  | 'best_format'
  | 'best_platform'
  | 'best_combination'
  | 'worst_combination'
  | 'opportunity';

export interface MatrixInsight {
  insightId: string;
  type: MatrixInsightType;
  dimension: MatrixDimension;
  value: string;
  avgScore: number;
  sampleSize: number;
  description: string;
  recommendation: string;
}

export interface MatrixRecommendation {
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  expectedImpact: string;
}

export interface DimensionAnalysis {
  dimension: MatrixDimension;
  values: Array<{ value: string; avgScore: number; sampleSize: number; performance: number }>;
  bestValue: string;
  worstValue: string;
}

export interface MatrixResult {
  matrix: VariantMatrix;
  winningCombinations: WinningCombination[];
  insights: MatrixInsight[];
  recommendations: MatrixRecommendation[];
  dimensionAnalysis: DimensionAnalysis[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MATRIX_COST_PER_CELL = 1;
export const MATRIX_MAX_CELLS = 100;

const ALL_DIMENSIONS: MatrixDimension[] = ['hook', 'angle', 'format', 'platform', 'tone', 'cta'];

const DIMENSION_META: Array<{ dimension: MatrixDimension; name: string; description: string }> = [
  { dimension: 'hook', name: 'Hook', description: 'Opening line that captures attention in the first seconds.' },
  { dimension: 'angle', name: 'Angle', description: 'Creative angle or narrative framing of the message.' },
  { dimension: 'format', name: 'Format', description: 'Ad format (video, image, story, reel, etc.).' },
  { dimension: 'platform', name: 'Platform', description: 'Distribution platform (TikTok, Instagram, YouTube, etc.).' },
  { dimension: 'tone', name: 'Tone', description: 'Voice and emotional tone of the creative.' },
  { dimension: 'cta', name: 'CTA', description: 'Call-to-action driving the desired response.' },
];

const AD_FORMAT_META: Array<{ format: AdFormat; name: string; description: string }> = [
  { format: 'video_vertical', name: 'Vertical Video', description: '9:16 vertical video for mobile feeds.' },
  { format: 'video_horizontal', name: 'Horizontal Video', description: '16:9 horizontal video for in-stream placements.' },
  { format: 'video_square', name: 'Square Video', description: '1:1 square video for feed placements.' },
  { format: 'image_single', name: 'Single Image', description: 'A single static image ad.' },
  { format: 'image_carousel', name: 'Image Carousel', description: 'A swipeable carousel of multiple images.' },
  { format: 'story', name: 'Story', description: 'Full-screen vertical story ad (24h placement).' },
  { format: 'reel', name: 'Reel', description: 'Short-form vertical reel optimized for discovery.' },
  { format: 'short', name: 'Short', description: 'YouTube-style short-form vertical video.' },
];

const VALID_AD_FORMATS: AdFormat[] = [
  'video_vertical',
  'video_horizontal',
  'video_square',
  'image_single',
  'image_carousel',
  'story',
  'reel',
  'short',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  // Deterministic-ish id with a random component. Crypto is available server-side;
  // fall back to Math.random for environments without it.
  const rand =
    typeof globalThis !== 'undefined' && globalThis.crypto && 'randomUUID' in globalThis.crypto
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Validate that a string is a known AdFormat. */
function isAdFormat(v: string): v is AdFormat {
  return (VALID_AD_FORMATS as string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Metadata for every supported matrix dimension.
 */
export function getMatrixDimensions(): Array<{ dimension: MatrixDimension; name: string; description: string }> {
  return DIMENSION_META.map((d) => ({ ...d }));
}

/**
 * Metadata for every supported ad format.
 */
export function getAdFormats(): Array<{ format: AdFormat; name: string; description: string }> {
  return AD_FORMAT_META.map((f) => ({ ...f }));
}

/**
 * Total number of cells produced by the cross-product of all axes.
 * Axes with no values contribute a factor of 1 (i.e. they are omitted).
 */
export function calculateMatrixSize(axes: MatrixAxis[]): number {
  let size = 1;
  for (const axis of axes) {
    const n = Array.isArray(axis.values) ? axis.values.length : 0;
    size *= Math.max(n, 1);
  }
  return size;
}

/**
 * Validate a raw matrix configuration object.
 */
export function validateMatrixConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const name = typeof config.name === 'string' ? config.name.trim() : '';
  if (!name) errors.push('name is required');

  const hooks = Array.isArray(config.hooks) ? config.hooks : undefined;
  if (!hooks || hooks.length < 2) errors.push('at least 2 hooks are required');

  const angles = Array.isArray(config.angles) ? config.angles : undefined;
  if (!angles || angles.length < 2) errors.push('at least 2 angles are required');

  const formats = Array.isArray(config.formats) ? config.formats : undefined;
  if (!formats || formats.length < 1) errors.push('at least 1 format is required');

  const platforms = Array.isArray(config.platforms) ? config.platforms : undefined;
  if (!platforms || platforms.length < 1) errors.push('at least 1 platform is required');

  // Validate format values if present
  if (formats) {
    for (const f of formats) {
      if (typeof f !== 'string' || !isAdFormat(f)) {
        errors.push(`invalid ad format: ${String(f)}`);
        break;
      }
    }
  }

  // Validate optional arrays are arrays of strings
  if (config.tones !== undefined && (!Array.isArray(config.tones) || config.tones.some((t) => typeof t !== 'string'))) {
    errors.push('tones must be an array of strings');
  }
  if (config.ctas !== undefined && (!Array.isArray(config.ctas) || config.ctas.some((t) => typeof t !== 'string'))) {
    errors.push('ctas must be an array of strings');
  }

  // Cell count limit (only if we have enough to compute it)
  if (hooks && angles && formats && platforms && errors.length === 0) {
    const tones = Array.isArray(config.tones) && config.tones.length > 0 ? config.tones.length : 1;
    const ctas = Array.isArray(config.ctas) && config.ctas.length > 0 ? config.ctas.length : 1;
    const total = hooks.length * angles.length * formats.length * platforms.length * tones * ctas;
    if (total > MATRIX_MAX_CELLS) {
      errors.push(`total cells (${total}) exceed maximum of ${MATRIX_MAX_CELLS}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate every cell in the cross-product of the supplied axes.
 * Cells start in the `untested` status with no performance data.
 */
export function generateCells(axes: MatrixAxis[]): MatrixCell[] {
  const usable = axes.filter((a) => Array.isArray(a.values) && a.values.length > 0);
  if (usable.length === 0) return [];

  // Cartesian product of all axis values.
  let combos: string[][] = [[]];
  for (const axis of usable) {
    const next: string[][] = [];
    for (const existing of combos) {
      for (const v of axis.values) {
        next.push([...existing, v]);
      }
    }
    combos = next;
  }

  const cells: MatrixCell[] = combos.map((combo) => {
    const coordinates: Partial<Record<MatrixDimension, string>> = {};
    usable.forEach((axis, i) => {
      coordinates[axis.dimension] = combo[i];
    });

    const hook = coordinates.hook ?? '';
    const angle = coordinates.angle ?? '';
    const formatRaw = coordinates.format ?? 'video_vertical';
    const format: AdFormat = isAdFormat(formatRaw) ? formatRaw : 'video_vertical';
    const platform = coordinates.platform ?? '';
    const tone = coordinates.tone ?? '';
    const cta = coordinates.cta ?? '';

    const cellId = generateId('cell');

    const cell: MatrixCell = {
      cellId,
      coordinates: coordinates as Record<MatrixDimension, string>,
      status: 'untested',
      hook,
      angle,
      format,
      platform,
      tone,
      cta,
    };
    return cell;
  });

  return cells;
}

/**
 * Compute a 0-100 composite score for a cell from its performance data.
 * Weighting: ROAS 40%, CTR 25%, CVR 20%, revenue 15% (each normalized).
 * Cells without performance return 0.
 */
export function calculateCellScore(cell: MatrixCell): number {
  const p = cell.performance;
  if (!p) return 0;

  // Normalize each metric to a 0-100 sub-score using soft caps.
  const roasScore = Math.min(p.roas / 5, 1) * 100; // 5x ROAS → full
  const ctrScore = Math.min(p.ctr / 0.1, 1) * 100; // 10% CTR → full
  const cvrScore = Math.min(p.cvr / 0.3, 1) * 100; // 30% CVR → full
  const revScore = Math.min(p.revenue / 1000, 1) * 100; // $1000 → full

  const score = roasScore * 0.4 + ctrScore * 0.25 + cvrScore * 0.2 + revScore * 0.15;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Build a VariantMatrix from a configuration object.
 * Throws if the total cell count exceeds MATRIX_MAX_CELLS.
 */
export function createMatrix(config: {
  name: string;
  hooks: string[];
  angles: string[];
  formats: AdFormat[];
  platforms: string[];
  tones?: string[];
  ctas?: string[];
}): VariantMatrix {
  const axes: MatrixAxis[] = [
    { dimension: 'hook', values: config.hooks },
    { dimension: 'angle', values: config.angles },
    { dimension: 'format', values: config.formats },
    { dimension: 'platform', values: config.platforms },
  ];
  if (config.tones && config.tones.length > 0) axes.push({ dimension: 'tone', values: config.tones });
  if (config.ctas && config.ctas.length > 0) axes.push({ dimension: 'cta', values: config.ctas });

  const totalCells = calculateMatrixSize(axes);
  if (totalCells > MATRIX_MAX_CELLS) {
    throw new Error(`Matrix exceeds maximum of ${MATRIX_MAX_CELLS} cells (got ${totalCells})`);
  }

  const cells = generateCells(axes);
  const ts = nowIso();

  return {
    matrixId: generateId('matrix'),
    name: config.name.trim(),
    axes,
    cells,
    totalCells: cells.length,
    generatedCells: 0,
    testedCells: 0,
    winningCells: 0,
    createdAt: ts,
    updatedAt: ts,
  };
}

/**
 * Analyze each dimension: average score and a normalized performance score per
 * value, plus the best and worst value for the dimension.
 */
export function analyzeDimensions(cells: MatrixCell[]): DimensionAnalysis[] {
  const results: DimensionAnalysis[] = [];

  for (const dim of ALL_DIMENSIONS) {
    // Group tested cells by the value they hold on this dimension.
    const byValue = new Map<string, MatrixCell[]>();
    for (const cell of cells) {
      const v = cell.coordinates[dim];
      if (!v) continue; // dimension not present in this matrix
      if (cell.status === 'untested' || !cell.performance) continue;
      const arr = byValue.get(v) ?? [];
      arr.push(cell);
      byValue.set(v, arr);
    }
    if (byValue.size === 0) continue;

    const values = Array.from(byValue.entries()).map(([value, group]) => {
      const scores = group.map((c) => c.score ?? calculateCellScore(c));
      const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const performance = group.reduce((acc, c) => acc + (c.performance?.roas ?? 0), 0) / group.length;
      return { value, avgScore: Math.round(avgScore * 100) / 100, sampleSize: group.length, performance: Math.round(performance * 100) / 100 };
    });

    values.sort((a, b) => b.avgScore - a.avgScore);

    results.push({
      dimension: dim,
      values,
      bestValue: values[0]?.value ?? '',
      worstValue: values[values.length - 1]?.value ?? '',
    });
  }

  return results;
}

/**
 * Identify winning combinations: groups of tested cells that share a common
 * pattern across dimensions and outperform the matrix average.
 */
export function identifyWinningCombinations(cells: MatrixCell[]): WinningCombination[] {
  const tested = cells.filter((c) => c.performance && c.status !== 'untested');
  if (tested.length < 2) return [];

  // Overall average score baseline.
  const allScores = tested.map((c) => c.score ?? calculateCellScore(c));
  const baseline = allScores.reduce((a, b) => a + b, 0) / allScores.length;

  const combinations: WinningCombination[] = [];

  // Find winning patterns per dimension: a value whose cells all score above
  // baseline and have positive ROAS.
  for (const dim of ALL_DIMENSIONS) {
    const byValue = new Map<string, MatrixCell[]>();
    for (const cell of tested) {
      const v = cell.coordinates[dim];
      if (!v) continue;
      const arr = byValue.get(v) ?? [];
      arr.push(cell);
      byValue.set(v, arr);
    }

    for (const [value, group] of byValue) {
      if (group.length < 2) continue;
      const scores = group.map((c) => c.score ?? calculateCellScore(c));
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const avgRoas = group.reduce((a, c) => a + (c.performance?.roas ?? 0), 0) / group.length;
      const totalConversions = group.reduce((a, c) => a + (c.performance?.conversions ?? 0), 0);

      if (avgScore > baseline && avgRoas > 1) {
        const confidenceScore = Math.round(Math.min(100, (group.length / tested.length) * 100 + avgScore * 0.5));
        const dimensions: Record<MatrixDimension, string> = {
          hook: '',
          angle: '',
          format: '',
          platform: '',
          tone: '',
          cta: '',
        };
        dimensions[dim] = value;
        combinations.push({
          combinationId: generateId('combo'),
          cellIds: group.map((c) => c.cellId),
          dimensions,
          avgScore: Math.round(avgScore * 100) / 100,
          avgRoas: Math.round(avgRoas * 100) / 100,
          totalConversions,
          confidenceScore,
          pattern: `${dim}="${value}"`,
          recommendation: `Scale creatives using ${dim} "${value}" — avg score ${Math.round(avgScore)}/100, ROAS ${avgRoas.toFixed(2)}x across ${group.length} cells.`,
        });
      }
    }
  }

  // Sort by confidence score descending and dedupe by pattern.
  combinations.sort((a, b) => b.confidenceScore - a.confidenceScore);
  const seen = new Set<string>();
  const deduped = combinations.filter((c) => {
    if (seen.has(c.pattern)) return false;
    seen.add(c.pattern);
    return true;
  });

  return deduped;
}

/**
 * Generate human-readable insights from cell data and dimension analysis.
 */
export function generateMatrixInsights(cells: MatrixCell[], dimensionAnalysis: DimensionAnalysis[]): MatrixInsight[] {
  const insights: MatrixInsight[] = [];
  const tested = cells.filter((c) => c.performance && c.status !== 'untested');

  if (tested.length === 0) {
    insights.push({
      insightId: generateId('insight'),
      type: 'opportunity',
      dimension: 'hook',
      value: '',
      avgScore: 0,
      sampleSize: 0,
      description: 'No cells have performance data yet.',
      recommendation: 'Launch creatives and import performance data to surface insights.',
    });
    return insights;
  }

  const dimTypeMap: Record<MatrixDimension, MatrixInsightType> = {
    hook: 'best_hook',
    angle: 'best_angle',
    format: 'best_format',
    platform: 'best_platform',
    tone: 'best_combination',
    cta: 'best_combination',
  };

  for (const da of dimensionAnalysis) {
    const best = da.values[0];
    const worst = da.values[da.values.length - 1];
    if (!best) continue;

    insights.push({
      insightId: generateId('insight'),
      type: dimTypeMap[da.dimension],
      dimension: da.dimension,
      value: best.value,
      avgScore: best.avgScore,
      sampleSize: best.sampleSize,
      description: `Best ${da.dimension} is "${best.value}" with avg score ${best.avgScore}/100 across ${best.sampleSize} cells.`,
      recommendation: `Prioritize "${best.value}" for ${da.dimension} in future creatives.`,
    });

    if (worst && worst.value !== best.value && da.values.length > 1) {
      insights.push({
        insightId: generateId('insight'),
        type: 'worst_combination',
        dimension: da.dimension,
        value: worst.value,
        avgScore: worst.avgScore,
        sampleSize: worst.sampleSize,
        description: `Worst ${da.dimension} is "${worst.value}" with avg score ${worst.avgScore}/100 across ${worst.sampleSize} cells.`,
        recommendation: `Avoid or iterate on "${worst.value}" for ${da.dimension}.`,
      });
    }
  }

  // Opportunity: untested cells remaining.
  const untestedCount = cells.filter((c) => c.status === 'untested').length;
  if (untestedCount > 0) {
    insights.push({
      insightId: generateId('insight'),
      type: 'opportunity',
      dimension: 'hook',
      value: '',
      avgScore: 0,
      sampleSize: untestedCount,
      description: `${untestedCount} cells are still untested.`,
      recommendation: 'Test remaining cells to complete the matrix and strengthen statistical confidence.',
    });
  }

  return insights;
}

/**
 * Produce prioritized recommendations from insights and winning combinations.
 */
function buildRecommendations(
  winning: WinningCombination[],
  insights: MatrixInsight[],
): MatrixRecommendation[] {
  const recs: MatrixRecommendation[] = [];

  for (const w of winning.slice(0, 3)) {
    recs.push({
      priority: 'high',
      recommendation: w.recommendation,
      expectedImpact: `Projected ROAS uplift from scaling the winning pattern (${w.pattern}).`,
    });
  }

  for (const ins of insights.filter((i) => i.type.startsWith('best_')).slice(0, 3)) {
    recs.push({
      priority: 'medium',
      recommendation: ins.recommendation,
      expectedImpact: `Improved ${ins.dimension} selection based on ${ins.sampleSize} tested cells.`,
    });
  }

  const opp = insights.find((i) => i.type === 'opportunity');
  if (opp) {
    recs.push({
      priority: 'low',
      recommendation: opp.recommendation,
      expectedImpact: 'Greater statistical confidence across the full matrix.',
    });
  }

  return recs;
}

/**
 * Run a full analysis over a matrix and return a MatrixResult.
 */
export function analyzeMatrix(matrix: VariantMatrix): MatrixResult {
  // Ensure scores are computed for cells that have performance but no score.
  const cells = matrix.cells.map((c) =>
    c.performance && c.score == null ? { ...c, score: calculateCellScore(c) } : c,
  );

  const dimensionAnalysis = analyzeDimensions(cells);
  const winningCombinations = identifyWinningCombinations(cells);
  const insights = generateMatrixInsights(cells, dimensionAnalysis);
  const recommendations = buildRecommendations(winningCombinations, insights);

  return {
    matrix: { ...matrix, cells },
    winningCombinations,
    insights,
    recommendations,
    dimensionAnalysis,
  };
}
