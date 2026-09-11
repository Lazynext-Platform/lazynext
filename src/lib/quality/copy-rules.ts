/**
 * Copy De-Slop Scanner — deterministic AI-writing-pattern detector.
 *
 * Ports the banned-phrase lexicon, structural-pattern rules, and 5-axis
 * scoring rubric from the vendored stop-slop (MIT, Hardik Pandya) and
 * no-ai-slop (MIT, Peter Yang) agent skills into a dependency-free
 * deterministic scanner. No LLM calls — pure string/regex analysis.
 *
 * Two modes:
 *  - scan: detect and report all slop patterns found (does not rewrite)
 *  - score: 5-axis rubric (directness, rhythm, trust, authenticity, density)
 *    scored 1-10 each, total /50, <35 = revise
 *
 * @see .agents/skills/stop-slop/SKILL.md
 * @see .agents/skills/no-ai-slop/SKILL.md
 */

// ── Types ──

export interface SlopHit {
  /** Pattern category. */
  category: SlopCategory;
  /** The matched text snippet. */
  match: string;
  /** 1-based line number (for multi-line input). */
  line: number;
  /** Short fix suggestion. */
  fix: string;
}

export type SlopCategory =
  | 'throat_clearing'
  | 'emphasis_crutch'
  | 'business_jargon'
  | 'adverb'
  | 'meta_commentary'
  | 'vague_declarative'
  | 'binary_contrast'
  | 'negative_listing'
  | 'dramatic_fragmentation'
  | 'rhetorical_setup'
  | 'false_agency'
  | 'narrator_distance'
  | 'passive_voice'
  | 'wh_starter'
  | 'em_dash'
  | 'lazy_extreme'
  | 'banned_word'
  | 'filler_phrase'
  | 'colon_reveal'
  | 'summary_recap'
  | 'importance_puffery'
  | 'weasel_attribution';

export interface CopySlopReport {
  hits: SlopHit[];
  totalHits: number;
  categories: Record<string, number>;
  /** 5-axis rubric score (0-50). */
  score: CopySlopScore;
  verdict: 'pass' | 'revise';
}

export interface CopySlopScore {
  directness: number;      // 1-10
  rhythm: number;          // 1-10
  trust: number;           // 1-10
  authenticity: number;     // 1-10
  density: number;          // 1-10
  total: number;            // sum /50
}

// ── Banned phrases (from stop-slop + no-ai-slop) ──

const THROAT_CLEARING: RegExp[] = [
  /\bhere'?s the thing\b/gi,
  /\bhere'?s what\b/gi,
  /\bhere'?s why\b/gi,
  /\bthe uncomfortable truth is\b/gi,
  /\bit turns out\b/gi,
  /\bthe real .{1,20} is\b/gi,
  /\blet me be clear\b/gi,
  /\bthe truth is,?\b/gi,
  /\bi'?ll say it again\b/gi,
  /\bi'?m going to be honest\b/gi,
  /\bcan we talk about\b/gi,
  /\bhere'?s what i find interesting\b/gi,
  /\bhere'?s the problem though\b/gi,
];

const EMPHASIS_CRUTCHES: RegExp[] = [
  /\bfull stop\b/gi,
  /\bperiod\.\s*$/gim,
  /\blet that sink in\b/gi,
  /\bthis matters because\b/gi,
  /\bmake no mistake\b/gi,
  /\bhere'?s why that matters\b/gi,
];

const ADVERBS: RegExp[] = [
  /\breally\b/gi,
  /\bjust\b/gi,
  /\bliterally\b/gi,
  /\bgenuinely\b/gi,
  /\bhonestly\b/gi,
  /\bsimply\b/gi,
  /\bactually\b/gi,
  /\bdeeply\b/gi,
  /\btruly\b/gi,
  /\bfundamentally\b/gi,
  /\binherently\b/gi,
  /\binevitably\b/gi,
  /\binterestingly\b/gi,
  /\bimportantly\b/gi,
  /\bcrucially\b/gi,
];

const BUSINESS_JARGON: RegExp[] = [
  /\bnavigate (challenges|uncertainty|complexity)\b/gi,
  /\bunpack (analysis|the|this)\b/gi,
  /\blean into\b/gi,
  /\blandscape (context|of)\b/gi,
  /\bgame[- ]changer\b/gi,
  /\bdouble down\b/gi,
  /\bdeep dive\b/gi,
  /\btake a step back\b/gi,
  /\bmoving forward\b/gi,
  /\bcircle back\b/gi,
  /\bon the same page\b/gi,
];

const META_COMMENTARY: RegExp[] = [
  /\bhint:\s/gi,
  /\bplot twist:\s/gi,
  /\bspoiler:\s/gi,
  /\byou already know this,? but\b/gi,
  /\bbut that'?s another post\b/gi,
  /\bis a feature,? not a bug\b/gi,
  /\bdressed up as\b/gi,
  /\bthe rest of this (essay|post|article)\b/gi,
  /\blet me walk you through\b/gi,
  /\bin this section,? we'?ll\b/gi,
  /\bas we'?ll see\b/gi,
  /\bi want to explore\b/gi,
];

const VAGUE_DECLARATIVES: RegExp[] = [
  /\bthe reasons are structural\b/gi,
  /\bthe implications are significant\b/gi,
  /\bthis is the deepest problem\b/gi,
  /\bthe stakes are high\b/gi,
  /\bthe consequences are real\b/gi,
];

const BINARY_CONTRASTS: RegExp[] = [
  /\bnot because .{1,40}\b because\b/gi,
  /\b.{1,30}isn'?t the problem\. .{1,30} is\./gi,
  /\bthe answer isn'?t .{1,30} it'?s\b/gi,
  /\bit feels like .{1,30} it'?s actually\b/gi,
  /\bthe question isn'?t .{1,30} it'?s\b/gi,
  /\bnot just .{1,30} but (also )?/gi,
];

const RHETORICAL_SETUPS: RegExp[] = [
  /\bwhat if i told you\b/gi,
  /\bhere'?s what i mean:?\s/gi,
  /\bthink about it:?\s/gi,
  /\band that'?s okay\.?\s*$/gim,
];

const FALSE_AGENCY: RegExp[] = [
  /\b(a|the) complaint becomes\b/gi,
  /\b(a|the) bet lives or dies\b/gi,
  /\bthe decision emerges\b/gi,
  /\bthe culture shifts\b/gi,
  /\bthe conversation moves toward\b/gi,
  /\bthe data tells us\b/gi,
  /\bthe market rewards\b/gi,
];

const FILLER_PHRASES: RegExp[] = [
  /\bit'?s worth noting\b/gi,
  /\bit'?s important to note\b/gi,
  /\bat the end of the day\b/gi,
  /\bwhen it comes to\b/gi,
  /\bat its core\b/gi,
  /\bin today'?s world\b/gi,
  /\bin the age of\b/gi,
  /\bin the world of\b/gi,
  /\bthe reality is,?\b/gi,
  /\bthe truth is,?\b/gi,
  /\bin terms of\b/gi,
  /\bwith regard to\b/gi,
  /\bin order to\b/gi,
  /\bgoing forward\b/gi,
  /\bin this article\b/gi,
  /\blet'?s dive in\b/gi,
];

const BANNED_WORDS: RegExp[] = [
  /\bdelve\b/gi,
  /\bfoster\b/gi,
  /\bleverage\b/gi,
  /\butilize\b/gi,
  /\bfacilitate\b/gi,
  /\bempower\b/gi,
  /\bstreamline\b/gi,
  /\brobust\b/gi,
  /\bcutting-edge\b/gi,
  /\bparadigm shift\b/gi,
  /\bgame changer\b/gi,
  /\bthis is huge\b/gi,
  /\bthis changes everything\b/gi,
  /\btapestry\b/gi,
  /\brealm\b/gi,
  /\bbeacon\b/gi,
  /\bmultifaceted\b/gi,
  /\bmeticulous\b/gi,
  /\bintricate\b/gi,
  /\bparamount\b/gi,
  /\btransformative\b/gi,
  /\belevate\b/gi,
  /\bembark\b/gi,
  /\bsupercharge\b/gi,
  /\bharness\b/gi,
  /\bever-evolving\b/gi,
];

const IMPORTANCE_PUFFERY: RegExp[] = [
  /\bstands as a testament\b/gi,
  /\bmarks a pivotal moment\b/gi,
  /\bplays a vital role\b/gi,
  /\bsolidifies its position\b/gi,
  /\bunderscores its significance\b/gi,
];

const WEASEL_ATTRIBUTION: RegExp[] = [
  /\bexperts agree\b/gi,
  /\bindustry reports suggest\b/gi,
  /\bmany argue\b/gi,
  /\bwidely regarded as\b/gi,
  /\bstudies show\b/gi,
];

const SUMMARY_RECAPS: RegExp[] = [
  /\bin conclusion,?\b/gi,
  /\bultimately,?\b/gi,
  /\boverall,?\b/gi,
];

const COLON_REVEALS: RegExp[] = [
  /\bthe (detail|best part|key|trick|secret): [a-z]/g,
];

const LAZY_EXTREMES: RegExp[] = [
  /\bevery (one|body|thing|time)\b/gi,
  /\balways\b/gi,
  /\bnever\b/gi,
  /\beveryone\b/gi,
  /\bnobody\b/gi,
];

// ── Passive voice (simplified heuristic) ──

const PASSIVE_VOICE: RegExp[] = [
  /\bwas (created|built|designed|developed|made|done|completed|launched|shipped)\b/gi,
  /\bit is believed that\b/gi,
  /\bmistakes were made\b/gi,
  /\bthe decision was reached\b/gi,
];

// ── Wh- sentence starters ──

const WH_STARTERS: RegExp[] = [
  /^(what|when|where|which|who|why|how)\s/gim,
];

// ── Em dash ──

const EM_DASH: RegExp[] = [
  /—/g,
  /\s--\s/g,
];

// ── Pattern registry ──

interface PatternDef {
  category: SlopCategory;
  patterns: RegExp[];
  fix: string;
}

const ALL_PATTERNS: PatternDef[] = [
  { category: 'throat_clearing', patterns: THROAT_CLEARING, fix: 'Cut the opener; state the point directly.' },
  { category: 'emphasis_crutch', patterns: EMPHASIS_CRUTCHES, fix: 'Delete; adds no meaning.' },
  { category: 'adverb', patterns: ADVERBS, fix: 'Cut the adverb unless it carries real emphasis or uncertainty.' },
  { category: 'business_jargon', patterns: BUSINESS_JARGON, fix: 'Replace with plain language.' },
  { category: 'meta_commentary', patterns: META_COMMENTARY, fix: 'Delete the self-referential aside; let the content move.' },
  { category: 'vague_declarative', patterns: VAGUE_DECLARATIVES, fix: 'Name the specific thing instead of announcing importance.' },
  { category: 'binary_contrast', patterns: BINARY_CONTRASTS, fix: 'State Y directly; drop the negation.' },
  { category: 'rhetorical_setup', patterns: RHETORICAL_SETUPS, fix: 'Drop the setup; make the point.' },
  { category: 'false_agency', patterns: FALSE_AGENCY, fix: 'Name the human actor; inanimate things don\'t act.' },
  { category: 'filler_phrase', patterns: FILLER_PHRASES, fix: 'Cut the filler; get to the point.' },
  { category: 'banned_word', patterns: BANNED_WORDS, fix: 'Replace with a concrete, specific word.' },
  { category: 'importance_puffery', patterns: IMPORTANCE_PUFFERY, fix: 'State the fact; let the reader judge importance.' },
  { category: 'weasel_attribution', patterns: WEASEL_ATTRIBUTION, fix: 'Name the source or cut the claim.' },
  { category: 'summary_recap', patterns: SUMMARY_RECAPS, fix: 'End on the last concrete point, not a recap.' },
  { category: 'colon_reveal', patterns: COLON_REVEALS, fix: 'Rewrite as a plain sentence; colons are for lists, not drama.' },
  { category: 'lazy_extreme', patterns: LAZY_EXTREMES, fix: 'Use specifics instead of sweeping claims.' },
  { category: 'passive_voice', patterns: PASSIVE_VOICE, fix: 'Find the actor; put them at the front of the sentence.' },
  { category: 'wh_starter', patterns: WH_STARTERS, fix: 'Restructure; lead with the subject or verb.' },
  { category: 'em_dash', patterns: EM_DASH, fix: 'Remove; use commas or periods.' },
];

// ── Scanner ──

/**
 * Scan prose for AI-slop patterns. Returns all hits with fix suggestions.
 * Does NOT rewrite — detection only.
 */
export function scanCopy(text: string): CopySlopReport {
  const lines = text.split('\n');
  const hits: SlopHit[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (const def of ALL_PATTERNS) {
      for (const pattern of def.patterns) {
        // Reset lastIndex for global regexes
        pattern.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(line)) !== null) {
          hits.push({
            category: def.category,
            match: m[0].trim().slice(0, 80),
            line: lineIdx + 1,
            fix: def.fix,
          });
          // Prevent infinite loop on zero-length matches
          if (m.index === pattern.lastIndex) pattern.lastIndex++;
        }
      }
    }
  }

  // Category counts
  const categories: Record<string, number> = {};
  for (const h of hits) {
    categories[h.category] = (categories[h.category] || 0) + 1;
  }

  const score = scoreCopy(text, hits);
  const verdict: 'pass' | 'revise' = score.total >= 35 ? 'pass' : 'revise';

  return { hits, totalHits: hits.length, categories, score, verdict };
}

// ── 5-axis scoring ──

/**
 * Score prose on 5 axes (1-10 each, total /50).
 * Below 35 = revise.
 *
 * Heuristic scoring — not a substitute for human judgment, but catches
 * the most common slop signals deterministically.
 */
export function scoreCopy(text: string, hits?: SlopHit[]): CopySlopScore {
  const h = hits ?? scanCopy(text).hits;
  const words = text.trim().split(/\s+/).filter(Boolean).length || 1;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
  const avgSentenceLen = words / sentences;

  // Base penalty: total slop density drags down all dimensions
  const totalHits = h.length;
  const slopDensity = totalHits / words * 100; // hits per 100 words
  const basePenalty = Math.min(4, slopDensity * 0.8);

  // Directness: penalize throat-clearing, filler, vague declaratives
  const directnessHits = h.filter(x =>
    ['throat_clearing', 'filler_phrase', 'vague_declarative', 'emphasis_crutch'].includes(x.category)
  ).length;
  const directness = clamp10(10 - directnessHits * 1.5 - basePenalty);

  // Rhythm: penalize repetitive sentence lengths and em dashes
  const emDashCount = h.filter(x => x.category === 'em_dash').length;
  const sentenceLens = text.split(/[.!?]+/).filter(s => s.trim()).map(s => s.trim().split(/\s+/).length);
  const lenVariance = sentenceLens.length > 1
    ? stdDev(sentenceLens) / (avgSentenceLen || 1)
    : 0;
  const rhythm = clamp10(10 - emDashCount * 1.0 - (lenVariance < 0.3 ? 2 : 0) - basePenalty);

  // Trust: penalize weasel attribution, importance puffery, rhetorical setups
  const trustHits = h.filter(x =>
    ['weasel_attribution', 'importance_puffery', 'rhetorical_setup', 'meta_commentary'].includes(x.category)
  ).length;
  const trust = clamp10(10 - trustHits * 1.5 - basePenalty);

  // Authenticity: penalize banned words, business jargon, binary contrasts
  const authHits = h.filter(x =>
    ['banned_word', 'business_jargon', 'binary_contrast', 'colon_reveal'].includes(x.category)
  ).length;
  const authenticity = clamp10(10 - authHits * 1.2 - basePenalty);

  // Density: penalize adverbs, filler, lazy extremes, summary recaps
  const densityHits = h.filter(x =>
    ['adverb', 'lazy_extreme', 'summary_recap', 'passive_voice'].includes(x.category)
  ).length;
  const density = clamp10(10 - densityHits * 1.0 - basePenalty);

  const total = directness + rhythm + trust + authenticity + density;
  return { directness, rhythm, trust, authenticity, density, total };
}

// ── Helpers ──

function clamp10(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n)));
}

function stdDev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// ── Credit cost (for registry integration) ──

export const COPY_DESLOP_CREDIT_COST = 2;
