/**
 * Design Slop Scanner — deterministic visual/UI-slop detector.
 *
 * Ports the 35 visual tells from the vendored kill-ai-slop (Apache-2.0, yetone)
 * agent skill into a dependency-free markup scanner. No LLM calls — pure
 * string/regex analysis over HTML/JSX/CSS/Tailwind source.
 *
 * Every match is a lead, not a verdict. The scanner flags defaults — a
 * gradient, serif, or emoji can be a real, defended choice. The caller
 * should triage slop vs. intentional before acting.
 *
 * @see .agents/skills/kill-ai-slop/SKILL.md
 * @see .agents/skills/kill-ai-slop/references/taxonomy.md
 * @see .agents/skills/kill-ai-slop/references/detection.md
 */

// ── Types ──

export interface DesignSlopHit {
  /** Tell ID (01-35). */
  id: string;
  /** Tell name. */
  name: string;
  /** Category: color, type, copy, components. */
  tier: 'classic' | 'evolved';
  /** The matched code snippet. */
  match: string;
  /** File path or source label. */
  source: string;
  /** Line number (1-based). */
  line: number;
  /** Short fix suggestion. */
  fix: string;
}

export interface DesignSlopReport {
  hits: DesignSlopHit[];
  totalHits: number;
  byTell: Record<string, number>;
  byTier: { classic: number; evolved: number };
}

// ── Tell definitions (subset of the 35 tells with deterministic patterns) ──

interface TellDef {
  id: string;
  name: string;
  tier: 'classic' | 'evolved';
  patterns: RegExp[];
  fix: string;
}

const TELLS: TellDef[] = [
  // 01 — Indigo→violet gradient
  {
    id: '01',
    name: 'Indigo→violet gradient',
    tier: 'classic',
    patterns: [
      /from-(indigo|violet|purple|fuchsia)-\d+.*to-(purple|violet|fuchsia|pink)-\d+/gi,
      /(linear-gradient|bg-gradient)[^;]*(#6366f1|#8b5cf6|#a855f7|#7c3aed)/gi,
      /shadow-(purple|violet|indigo)-\d+\/\d+/gi,
    ],
    fix: 'Use one justified solid accent; if a gradient, give it direction and a reason.',
  },
  // 02 — Gradient headline text
  {
    id: '02',
    name: 'Gradient headline text',
    tier: 'classic',
    patterns: [
      /bg-clip-text.*text-transparent|text-transparent.*bg-clip-text/gi,
      /(-webkit-)?background-clip:\s*text/gi,
      /-webkit-text-fill-color:\s*transparent/gi,
    ],
    fix: 'Use solid color for headings; build hierarchy with size, weight, and space.',
  },
  // 03 — Warm "cozy" palette
  {
    id: '03',
    name: 'Warm cozy palette',
    tier: 'classic',
    patterns: [
      /\b(amber|orange|stone)-(50|100|200|300)\b/gi,
      /bg-\[#(fdf6ec|fef3e2|faf3e8|fff7ed|fdf4e3)\]/gi,
    ],
    fix: 'Use a neutral base + one restrained warm accent; warmth comes from words.',
  },
  // 04 — Default semantic palette
  {
    id: '04',
    name: 'Default semantic palette',
    tier: 'classic',
    patterns: [
      /bg-(blue|indigo)-50|bg-amber-50|bg-green-50|bg-emerald-50|bg-red-50/gi,
      /info.*blue|warning.*amber|success.*green|error.*red/gi,
    ],
    fix: 'Grow semantic colors out of your one palette; color only states that truly differ.',
  },
  // 05 — One-hue status box
  {
    id: '05',
    name: 'One-hue status box',
    tier: 'classic',
    patterns: [
      /border-(red|amber|yellow|green|blue)-\d+[^"]*text-\1-\d+/gi,
      /bg-(red|amber|yellow|green)-\d+\/(5|10|15|20)/gi,
    ],
    fix: 'Carry the state in words and weight first; one muted accent on a neutral surface.',
  },
  // 06 — Gradients as atmosphere
  {
    id: '06',
    name: 'Gradients as atmosphere',
    tier: 'classic',
    patterns: [
      /radial-gradient|bg-\[radial-gradient/gi,
      /repeating-(linear|radial)-gradient/gi,
      /bg-gradient-to-(b|t)\b/gi,
    ],
    fix: 'Pick one flat background; build surface depth with a hairline and restrained shadow.',
  },
  // 07 — Serif-italic on one word
  {
    id: '07',
    name: 'Serif-italic emphasis',
    tier: 'classic',
    patterns: [
      /font-serif|font-family:\s*(georgia|"?playfair|"?lora|"?cormorant)/gi,
    ],
    fix: 'Emphasize with weight, position, or a line break; keep one voice.',
  },
  // 08 — Serif where sans belongs
  {
    id: '08',
    name: 'Serif where sans belongs',
    tier: 'classic',
    patterns: [
      /font-family:\s*[^;]*(playfair|cormorant|lora|"?dm serif|"?libre baskerville)/gi,
      /fontFamily.*(Playfair|Cormorant|Lora)/gi,
    ],
    fix: 'Use one legible sans you chose; serif only when the product voice is genuinely editorial.',
  },
  // 09 — Decorative strikes & highlights
  {
    id: '09',
    name: 'Decorative strikes & highlights',
    tier: 'classic',
    patterns: [
      /line-through/gi,
      /<(mark|s|u|del|strike)[\s>]/gi,
      /text-decoration:\s*(line-through|underline)/gi,
    ],
    fix: 'Let weight, size, and structure carry emphasis; keep strike for real edits, underline for links.',
  },
  // 10 — Kicker above every heading
  {
    id: '10',
    name: 'Kicker above every heading',
    tier: 'classic',
    patterns: [
      /uppercase[\s\S]{0,40}tracking-(wide|wider|widest)|tracking-(wide|wider|widest)[\s\S]{0,40}uppercase/gi,
      /\b(eyebrow|kicker|overline)\b/gi,
    ],
    fix: 'Delete any kicker that restates its heading; keep one only where it adds a real dimension.',
  },
  // 11 — Full-sentence display headline
  {
    id: '11',
    name: 'Full-sentence display headline',
    tier: 'classic',
    patterns: [
      /text-(5|6|7|8|9)xl/gi,
      /tracking-tighter?\b[\s\S]{0,40}font-(extrabold|black)|font-(extrabold|black)[\s\S]{0,40}tracking-tighter?\b/gi,
    ],
    fix: 'Compress the point into a few words at display size; say the rest in a normal-size subline.',
  },
  // 13 — Highlighted keywords
  {
    id: '13',
    name: 'Highlighted keywords',
    tier: 'classic',
    patterns: [
      /<mark/gi,
      /text-(primary|indigo|purple|violet)-\d+/gi,
    ],
    fix: 'Let sentence structure carry emphasis; at most one accent per paragraph.',
  },
  // 14 — AI copywriting voice
  {
    id: '14',
    name: 'AI copywriting voice',
    tier: 'classic',
    patterns: [
      /not just .{1,40}\bit'?s\b|say goodbye to|meet your new|supercharge|unlock the power|in seconds, not/gi,
      /\b(blazing[- ]fast|effortless|seamless|game[- ]changer|next[- ]level)\b/gi,
      /\b(growth|security|process|privacy|productivity|compliance|feature|innovation) theater\b/gi,
    ],
    fix: 'Write something specific — real numbers, nouns, consequences.',
  },
  // 15 — Emoji everywhere
  {
    id: '15',
    name: 'Emoji everywhere',
    tier: 'classic',
    patterns: [
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu,
    ],
    fix: 'Cut decorative emoji from the UI; keep one only where it carries real information.',
  },
  // 16 — Glowing status dot
  {
    id: '16',
    name: 'Glowing status dot',
    tier: 'classic',
    patterns: [
      /animate-ping|animate-pulse/gi,
      /shadow-(green|emerald|lime)-\d+\/\d+|box-shadow:[^;]*(0 0|glow)/gi,
    ],
    fix: 'A small, flat, single-color dot plus a word; no halo, no pulse.',
  },
  // 17 — Rounded card, colored left border
  {
    id: '17',
    name: 'Rounded card, colored left border',
    tier: 'classic',
    patterns: [
      /border-l-4 .*rounded|rounded.* border-l-4/gi,
      /border-left:\s*\d+px .*;.*border-radius/gi,
    ],
    fix: 'Let a list be a list; callouts are scarce — one or two a page, only for a genuine aside.',
  },
  // 18 — Rounded-square icon tiles
  {
    id: '18',
    name: 'Rounded-square icon tiles',
    tier: 'classic',
    patterns: [
      /rounded-(xl|2xl|3xl).*p-\d+.*<\w*[Ii]con/gi,
    ],
    fix: 'An icon must carry meaning or go; a clear label + one sentence beats a row of glyphs.',
  },
  // 19 — Max radius + glassmorphism
  {
    id: '19',
    name: 'Max radius + glassmorphism',
    tier: 'classic',
    patterns: [
      /backdrop-blur/gi,
      /rounded-full.*backdrop|backdrop.*rounded-full/gi,
    ],
    fix: 'Pick one small radius token; replace blur panes with solid surfaces.',
  },
  // 20 — Oversized drop shadow
  {
    id: '20',
    name: 'Oversized drop shadow',
    tier: 'classic',
    patterns: [
      /shadow-(2xl|3xl)|box-shadow:[^;]*\d{2,}px\s+\d{2,}px/gi,
    ],
    fix: 'Shrink to a real elevation: tight blur, small offset, low opacity.',
  },
  // 23 — Badge & pill spam
  {
    id: '23',
    name: 'Badge & pill spam',
    tier: 'classic',
    patterns: [
      /<Pill|<Badge|<Chip/gi,
    ],
    fix: 'Delete decorative pills; keep at most a real status tag.',
  },
  // 29 — 01/02/03 section markers
  {
    id: '29',
    name: '01/02/03 section markers',
    tier: 'evolved',
    patterns: [
      /\b0[1-9]\b[\s\S]{0,20}<h[1-3]/gi,
      /text-\d+xl.*\b0[1-9]\b/gi,
    ],
    fix: 'Use real headings or a genuine sequence number, not decorative zero-padded markers.',
  },
  // 30 — Cards nested in cards
  {
    id: '30',
    name: 'Cards nested in cards',
    tier: 'evolved',
    patterns: [
      /<div[^>]*rounded.*<div[^>]*rounded/gi,
    ],
    fix: 'Don\'t nest cards inside cards; use one surface per concept.',
  },
  // 32 — Default Inter/Space Grotesk look
  {
    id: '32',
    name: 'Default Inter/Space Grotesk look',
    tier: 'evolved',
    patterns: [
      /font-family:\s*['"]?Inter['"]?|fontFamily.*Inter/gi,
      /font-family:\s*['"]?Space Grotesk['"]?|fontFamily.*Space Grotesk/gi,
    ],
    fix: 'Choose a font that fits the product identity; don\'t use the AI default.',
  },
];

// ── Scanner ──

/**
 * Scan markup/source code for visual AI-slop patterns.
 * Returns all hits with fix suggestions. Does NOT edit files.
 */
export function scanMarkup(
  source: string,
  sourceLabel = 'input',
): DesignSlopReport {
  const lines = source.split('\n');
  const hits: DesignSlopHit[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (const tell of TELLS) {
      for (const pattern of tell.patterns) {
        pattern.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(line)) !== null) {
          hits.push({
            id: tell.id,
            name: tell.name,
            tier: tell.tier,
            match: m[0].trim().slice(0, 120),
            source: sourceLabel,
            line: lineIdx + 1,
            fix: tell.fix,
          });
          if (m.index === pattern.lastIndex) pattern.lastIndex++;
        }
      }
    }
  }

  // Aggregation
  const byTell: Record<string, number> = {};
  for (const h of hits) {
    byTell[h.id] = (byTell[h.id] || 0) + 1;
  }
  const byTier = {
    classic: hits.filter(h => h.tier === 'classic').length,
    evolved: hits.filter(h => h.tier === 'evolved').length,
  };

  return { hits, totalHits: hits.length, byTell, byTier };
}

// ── Credit cost ──

export const DESIGN_AUDIT_CREDIT_COST = 2;
