/**
 * Editing skill archive — a data model for archiving and reusing
 * reusable editing patterns/skills that can be applied to future video edits.
 *
 * Inspired by FireRed-OpenStoryline (#64): editing skill archiving.
 * Apache-2.0 — ideas only, no code copied.
 *
 * An "editing skill" is a named, reusable pattern that describes:
 * - What kind of content it's good for (e.g. "talking head", "product demo")
 * - What cuts/transitions/effects to apply
 * - What parameters can be tuned
 */

/** Type of content the skill is designed for. */
export type ContentType =
  | 'talking-head'
  | 'product-demo'
  | 'ugc'
  | 'drama'
  | 'tutorial'
  | 'testimonial'
  | 'unboxing'
  | 'before-after'
  | 'story';

/** Type of edit action in a skill step. */
export type EditActionType =
  | 'cut'
  | 'trim'
  | 'speed-ramp'
  | 'zoom'
  | 'pan'
  | 'text-overlay'
  | 'caption'
  | 'transition'
  | 'color-grade'
  | 'audio-duck'
  | 'audio-boost'
  | 'b-roll'
  | 'freeze-frame'
  | 'split-screen';

/** A single step in an editing skill. */
export interface EditStep {
  /** Step order (1-based). */
  order: number;
  /** Action type. */
  action: EditActionType;
  /** When to apply (e.g. "on every pause", "at hook", "at CTA"). */
  trigger: string;
  /** Parameters for the action. */
  params: Record<string, unknown>;
  /** Human-readable description. */
  description: string;
}

/** An editing skill — a reusable editing pattern. */
export interface EditingSkill {
  /** Unique identifier. */
  id: string;
  /** Human-readable name (e.g. "Fast-Paced Hook Cut"). */
  name: string;
  /** What this skill does. */
  description: string;
  /** Content types this skill is best for. */
  contentTypes: ContentType[];
  /** Platforms this skill is optimized for. */
  platforms: string[];
  /** The editing steps in order. */
  steps: EditStep[];
  /** Estimated time to apply (minutes). */
  estimatedTimeMin: number;
  /** Tags for searchability. */
  tags: string[];
  /** Whether this is a built-in or user-created skill. */
  source: 'builtin' | 'user';
  /** Who created it (for user skills). */
  createdBy?: string;
  /** Creation timestamp. */
  createdAt: string;
  /** Last update timestamp. */
  updatedAt: string;
}

/** Built-in editing skills — curated patterns from research. */
export const BUILTIN_SKILLS: EditingSkill[] = [
  {
    id: 'fast-paced-hook-cut',
    name: 'Fast-Paced Hook Cut',
    description: 'Rapid cuts in the first 3 seconds to maximize hook retention. Removes pauses, zooms on key words, adds captions.',
    contentTypes: ['talking-head', 'ugc', 'product-demo'],
    platforms: ['tiktok', 'instagram', 'youtube'],
    steps: [
      { order: 1, action: 'cut', trigger: 'on every pause > 0.5s', params: { mode: 'remove' }, description: 'Remove all pauses longer than 0.5 seconds' },
      { order: 2, action: 'zoom', trigger: 'at hook word', params: { scale: 1.3, duration: 0.3 }, description: 'Quick zoom on the hook word/phrase' },
      { order: 3, action: 'caption', trigger: 'throughout', params: { style: 'bold', position: 'center-bottom', highlightColor: '#FFD700' }, description: 'Add bold captions with keyword highlighting' },
      { order: 4, action: 'speed-ramp', trigger: 'on B-roll', params: { speed: 2, duration: 0.5 }, description: 'Speed up B-roll footage for energy' },
    ],
    estimatedTimeMin: 5,
    tags: ['hook', 'retention', 'fast-cut', 'captions'],
    source: 'builtin',
    createdAt: '2026-08-28T00:00:00Z',
    updatedAt: '2026-08-28T00:00:00Z',
  },
  {
    id: 'product-demo-zoom-pan',
    name: 'Product Demo Zoom & Pan',
    description: 'Smooth zoom and pan on product features during demo segments. Adds text overlays for key benefits.',
    contentTypes: ['product-demo', 'unboxing', 'before-after'],
    platforms: ['tiktok', 'instagram', 'youtube', 'facebook'],
    steps: [
      { order: 1, action: 'zoom', trigger: 'on product closeup', params: { scale: 1.5, duration: 1.0, ease: 'ease-in-out' }, description: 'Zoom in on product detail' },
      { order: 2, action: 'pan', trigger: 'after zoom', params: { direction: 'left-to-right', duration: 2.0 }, description: 'Pan across product features' },
      { order: 3, action: 'text-overlay', trigger: 'on feature', params: { position: 'top', style: 'clean', duration: 2.0 }, description: 'Add feature name overlay' },
      { order: 4, action: 'transition', trigger: 'between features', params: { type: 'slide', duration: 0.3 }, description: 'Slide transition between product features' },
    ],
    estimatedTimeMin: 8,
    tags: ['product', 'demo', 'zoom', 'pan', 'overlay'],
    source: 'builtin',
    createdAt: '2026-08-28T00:00:00Z',
    updatedAt: '2026-08-28T00:00:00Z',
  },
  {
    id: 'drama-emotional-build',
    name: 'Drama Emotional Build',
    description: 'Slow build with escalating pacing. Starts with wide shots, tightens to closeups, uses audio ducking for emotional peaks.',
    contentTypes: ['drama', 'story', 'testimonial'],
    platforms: ['youtube', 'instagram', 'tiktok'],
    steps: [
      { order: 1, action: 'cut', trigger: 'at scene start', params: { pace: 'slow', minDuration: 3.0 }, description: 'Slow cuts at the beginning for setup' },
      { order: 2, action: 'audio-duck', trigger: 'at dialogue', params: { reduction: -6, fadeOut: 0.5 }, description: 'Duck music under dialogue' },
      { order: 3, action: 'cut', trigger: 'at emotional peak', params: { pace: 'fast', minDuration: 1.0 }, description: 'Tight cuts at emotional climax' },
      { order: 4, action: 'zoom', trigger: 'at climax', params: { scale: 1.2, duration: 0.5 }, description: 'Subtle push-in at climax' },
      { order: 5, action: 'audio-boost', trigger: 'at resolution', params: { boost: 3, fadeIn: 1.0 }, description: 'Boost music at resolution' },
    ],
    estimatedTimeMin: 12,
    tags: ['drama', 'emotion', 'pacing', 'audio'],
    source: 'builtin',
    createdAt: '2026-08-28T00:00:00Z',
    updatedAt: '2026-08-28T00:00:00Z',
  },
  {
    id: 'ugc-raw-cut',
    name: 'UGC Raw Cut',
    description: 'Minimal editing for authentic UGC feel. Only removes dead air and adds captions. Keeps natural imperfections.',
    contentTypes: ['ugc', 'testimonial', 'unboxing'],
    platforms: ['tiktok', 'instagram', 'youtube'],
    steps: [
      { order: 1, action: 'cut', trigger: 'on silence > 2s', params: { mode: 'remove' }, description: 'Remove only long silences' },
      { order: 2, action: 'caption', trigger: 'throughout', params: { style: 'casual', position: 'center-bottom', autoGenerate: true }, description: 'Auto-generated casual captions' },
      { order: 3, action: 'color-grade', trigger: 'throughout', params: { preset: 'natural' }, description: 'Light natural color grade' },
    ],
    estimatedTimeMin: 3,
    tags: ['ugc', 'authentic', 'minimal', 'captions'],
    source: 'builtin',
    createdAt: '2026-08-28T00:00:00Z',
    updatedAt: '2026-08-28T00:00:00Z',
  },
  {
    id: 'tutorial-step-by-step',
    name: 'Tutorial Step-by-Step',
    description: 'Structured cuts for tutorials. Each step gets a text overlay, zoom on detail, and clear transitions between steps.',
    contentTypes: ['tutorial', 'product-demo'],
    platforms: ['youtube', 'instagram', 'tiktok'],
    steps: [
      { order: 1, action: 'text-overlay', trigger: 'at each step', params: { position: 'top', style: 'numbered', duration: 3.0 }, description: 'Numbered step overlay' },
      { order: 2, action: 'zoom', trigger: 'on detail', params: { scale: 2.0, duration: 2.0, ease: 'ease-in-out' }, description: 'Zoom on detail being explained' },
      { order: 3, action: 'transition', trigger: 'between steps', params: { type: 'fade', duration: 0.5 }, description: 'Fade transition between steps' },
      { order: 4, action: 'freeze-frame', trigger: 'at key moment', params: { duration: 1.5 }, description: 'Freeze frame on key result' },
    ],
    estimatedTimeMin: 10,
    tags: ['tutorial', 'educational', 'steps', 'zoom'],
    source: 'builtin',
    createdAt: '2026-08-28T00:00:00Z',
    updatedAt: '2026-08-28T00:00:00Z',
  },
];

/** In-memory skill store (future: persist to D1). */
const skillStore = new Map<string, EditingSkill>(
  BUILTIN_SKILLS.map(s => [s.id, { ...s }])
);

/** Get a skill by ID. */
export function getSkill(id: string): EditingSkill | undefined {
  return skillStore.get(id);
}

/** List all skills, optionally filtered by content type or platform. */
export function listSkills(opts?: { contentType?: ContentType; platform?: string; tag?: string }): EditingSkill[] {
  let skills = [...skillStore.values()];
  if (opts?.contentType) {
    skills = skills.filter(s => s.contentTypes.includes(opts.contentType!));
  }
  if (opts?.platform) {
    skills = skills.filter(s => s.platforms.includes(opts.platform!));
  }
  if (opts?.tag) {
    skills = skills.filter(s => s.tags.includes(opts.tag!));
  }
  return skills;
}

/** Create a new user skill. */
export function createSkill(skill: Omit<EditingSkill, 'id' | 'source' | 'createdAt' | 'updatedAt'>): EditingSkill {
  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const newSkill: EditingSkill = {
    ...skill,
    id,
    source: 'user',
    createdAt: now,
    updatedAt: now,
  };
  skillStore.set(id, newSkill);
  return newSkill;
}

/** Update an existing skill. */
export function updateSkill(id: string, updates: Partial<EditingSkill>): EditingSkill | undefined {
  const existing = skillStore.get(id);
  if (!existing) return undefined;
  if (existing.source === 'builtin') return undefined; // Can't modify builtins
  const updated: EditingSkill = {
    ...existing,
    ...updates,
    id: existing.id,
    source: existing.source,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  skillStore.set(id, updated);
  return updated;
}

/** Delete a skill (only user skills can be deleted). */
export function deleteSkill(id: string): boolean {
  const skill = skillStore.get(id);
  if (!skill || skill.source === 'builtin') return false;
  return skillStore.delete(id);
}

/** Find skills suitable for given content type and platform. */
export function recommendSkills(contentType: ContentType, platform?: string): EditingSkill[] {
  return listSkills({ contentType, platform })
    .sort((a, b) => b.tags.length - a.tags.length);
}
