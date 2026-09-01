/**
 * Conversational Clip Editor.
 *
 * A clip-centric editing interface that accepts natural language commands
 * and executes them on a clip timeline. Includes a deterministic command
 * parser for common operations and an AI-enhanced parser for complex or
 * ambiguous commands.
 *
 * Architecture inspired by OpenChatCut (#48, AGPL-3.0) — ideas only,
 * NO code reuse. Fully original implementation for LazyNext's MIT codebase.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import { isDryRun } from '@/lib/creative/toolkit';
import type { PlanTier } from '@/lib/plan-tier';

export const CLIP_EDITOR_COST = 4;

// ── Types ──

export type ClipType = 'video' | 'audio' | 'image' | 'text' | 'transition' | 'effect';

export type OperationType =
  | 'trim'
  | 'split'
  | 'delete'
  | 'reorder'
  | 'add'
  | 'speed'
  | 'volume'
  | 'merge'
  | 'duplicate'
  | 'label';

export interface Clip {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  source: string;
  type: ClipType;
  label: string;
  notes: string;
}

export interface ClipOperation {
  type: OperationType;
  targetClipId?: string;
  params: Record<string, unknown>;
}

export interface CommandParseResult {
  operation: ClipOperation;
  confidence: number;
  rawCommand: string;
}

export interface ClipEditResult {
  clips: Clip[];
  operation: ClipOperation;
  description: string;
  affectedClipIds: string[];
  success: boolean;
  dryRun?: boolean;
}

// ── Timecode utilities ──

/**
 * Parse a timecode string to seconds.
 * Supports: "0:15", "1:23.456", "15s", "90", "1m30s"
 */
export function parseTimecode(str: string): number {
  if (!str) return 0;
  const s = str.trim().toLowerCase();

  // "15s" or "90" (bare seconds)
  const secondsMatch = s.match(/^(\d+(?:\.\d+)?)s?$/);
  if (secondsMatch) return parseFloat(secondsMatch[1]);

  // "1m30s" or "2m"
  const minSecMatch = s.match(/^(\d+)m\s*(\d+(?:\.\d+)?)?s?$/);
  if (minSecMatch) {
    const mins = parseInt(minSecMatch[1], 10);
    const secs = minSecMatch[2] ? parseFloat(minSecMatch[2]) : 0;
    return mins * 60 + secs;
  }

  // "1:23" or "1:23.456" or "0:15"
  const colonMatch = s.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/);
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10);
    const secs = parseFloat(colonMatch[2]);
    return mins * 60 + secs;
  }

  // "1:23:45" (hours:minutes:seconds)
  const fullColonMatch = s.match(/^(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  if (fullColonMatch) {
    const hours = parseInt(fullColonMatch[1], 10);
    const mins = parseInt(fullColonMatch[2], 10);
    const secs = parseFloat(fullColonMatch[3]);
    return hours * 3600 + mins * 60 + secs;
  }

  return 0;
}

/**
 * Format seconds as "MM:SS.mmm".
 */
export function formatTimecode(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

// ── Clip utilities ──

let clipIdCounter = 0;

/**
 * Create a new clip with defaults.
 */
export function createClip(partial: Partial<Clip> = {}): Clip {
  const id = partial.id || `clip-${++clipIdCounter}-${Date.now().toString(36)}`;
  const startTime = partial.startTime ?? 0;
  const endTime = partial.endTime ?? 5;
  const duration = partial.duration ?? (endTime - startTime);
  return {
    id,
    name: partial.name ?? `Clip ${clipIdCounter}`,
    startTime,
    endTime,
    duration,
    source: partial.source ?? '',
    type: partial.type ?? 'video',
    label: partial.label ?? '',
    notes: partial.notes ?? '',
  };
}

/**
 * Calculate the total duration of all clips.
 */
export function calculateTotalDuration(clips: Clip[]): number {
  return clips.reduce((sum, clip) => sum + clip.duration, 0);
}

/**
 * Re-index clip start/end times so clips are sequential.
 */
export function reindexTimeline(clips: Clip[]): Clip[] {
  let cursor = 0;
  return clips.map((clip) => {
    const newClip = { ...clip, startTime: cursor, endTime: cursor + clip.duration };
    cursor += clip.duration;
    return newClip;
  });
}

// ── Deterministic command parser ──

/**
 * Parse a natural language command into a clip operation.
 * Handles the 10 supported command types with regex matching.
 * Returns confidence 1.0 for exact matches, 0.5-0.8 for fuzzy matches.
 */
export function parseCommand(command: string): CommandParseResult {
  const cmd = command.trim().toLowerCase();
  const rawCommand = command;

  // ── Trim ──
  // "trim first 2 seconds", "trim first 2s", "trim first 2"
  let m = cmd.match(/^trim\s+first\s+(\d+(?:\.\d+)?)\s*(?:s(?:econds?)?)?$/);
  if (m) {
    return { operation: { type: 'trim', params: { position: 'start', amount: parseFloat(m[1]) } }, confidence: 1.0, rawCommand };
  }
  // "trim last 1.5s", "trim last 3 seconds", "trim last 3"
  m = cmd.match(/^trim\s+last\s+(\d+(?:\.\d+)?)\s*(?:s(?:econds?)?)?$/);
  if (m) {
    return { operation: { type: 'trim', params: { position: 'end', amount: parseFloat(m[1]) } }, confidence: 1.0, rawCommand };
  }
  // "trim clip 3 to 5 seconds"
  m = cmd.match(/^trim\s+clip\s+(\d+)\s+to\s+(\d+(?:\.\d+)?)\s*s?econds?$/);
  if (m) {
    return { operation: { type: 'trim', params: { clipIndex: parseInt(m[1], 10) - 1, targetDuration: parseFloat(m[2]) } }, confidence: 1.0, rawCommand };
  }

  // ── Split ──
  // "split at 10 seconds", "split at 0:15"
  m = cmd.match(/^split\s+at\s+([\d:.]+)$/);
  if (m) {
    return { operation: { type: 'split', params: { at: parseTimecode(m[1]) } }, confidence: 1.0, rawCommand };
  }
  // "split clip 2 at 0:15"
  m = cmd.match(/^split\s+clip\s+(\d+)\s+at\s+([\d:.]+)$/);
  if (m) {
    return { operation: { type: 'split', params: { clipIndex: parseInt(m[1], 10) - 1, at: parseTimecode(m[2]) } }, confidence: 1.0, rawCommand };
  }

  // ── Delete / Remove ──
  // "delete clip 3"
  m = cmd.match(/^(?:delete|remove)\s+clip\s+(\d+)$/);
  if (m) {
    return { operation: { type: 'delete', params: { clipIndex: parseInt(m[1], 10) - 1 } }, confidence: 1.0, rawCommand };
  }
  // "delete the last clip", "remove the first clip"
  m = cmd.match(/^(?:delete|remove)\s+(?:the\s+)?(first|last)\s+clip$/);
  if (m) {
    return { operation: { type: 'delete', params: { position: m[1] } }, confidence: 1.0, rawCommand };
  }
  // "delete clips 2-4"
  m = cmd.match(/^(?:delete|remove)\s+clips\s+(\d+)\s*[-to]\s*(\d+)$/);
  if (m) {
    return { operation: { type: 'delete', params: { rangeStart: parseInt(m[1], 10) - 1, rangeEnd: parseInt(m[2], 10) - 1 } }, confidence: 1.0, rawCommand };
  }

  // ── Reorder ──
  // "move clip 5 to position 2"
  m = cmd.match(/^move\s+clip\s+(\d+)\s+to\s+position\s+(\d+)$/);
  if (m) {
    return { operation: { type: 'reorder', params: { fromIndex: parseInt(m[1], 10) - 1, toIndex: parseInt(m[2], 10) - 1 } }, confidence: 1.0, rawCommand };
  }
  // "swap clips 1 and 3"
  m = cmd.match(/^swap\s+clips\s+(\d+)\s+(?:and|with)\s+(\d+)$/);
  if (m) {
    return { operation: { type: 'reorder', params: { swap: true, indexA: parseInt(m[1], 10) - 1, indexB: parseInt(m[2], 10) - 1 } }, confidence: 1.0, rawCommand };
  }

  // ── Add ──
  // "add a transition at 0:10"
  m = cmd.match(/^add\s+(?:a\s+)?transition\s+at\s+([\d:.]+)$/);
  if (m) {
    return { operation: { type: 'add', params: { clipType: 'transition', at: parseTimecode(m[1]) } }, confidence: 1.0, rawCommand };
  }
  // "insert text 'Buy Now' at 0:05"
  m = cmd.match(/^insert\s+text\s+['"](.+?)['"]\s+at\s+([\d:.]+)$/);
  if (m) {
    return { operation: { type: 'add', params: { clipType: 'text', text: m[1], at: parseTimecode(m[2]) } }, confidence: 1.0, rawCommand };
  }

  // ── Speed ──
  // "speed up clip 2 by 2x"
  m = cmd.match(/^speed\s+up\s+clip\s+(\d+)\s+by\s+(\d+(?:\.\d+)?)x?$/);
  if (m) {
    return { operation: { type: 'speed', params: { clipIndex: parseInt(m[1], 10) - 1, factor: parseFloat(m[2]) } }, confidence: 1.0, rawCommand };
  }
  // "slow down clip 3"
  m = cmd.match(/^slow\s+down\s+clip\s+(\d+)$/);
  if (m) {
    return { operation: { type: 'speed', params: { clipIndex: parseInt(m[1], 10) - 1, factor: 0.5 } }, confidence: 0.9, rawCommand };
  }

  // ── Volume ──
  // "mute clip 2"
  m = cmd.match(/^mute\s+clip\s+(\d+)$/);
  if (m) {
    return { operation: { type: 'volume', params: { clipIndex: parseInt(m[1], 10) - 1, level: 0 } }, confidence: 1.0, rawCommand };
  }
  // "lower volume on clip 5"
  m = cmd.match(/^lower\s+volume\s+(?:on\s+)?clip\s+(\d+)$/);
  if (m) {
    return { operation: { type: 'volume', params: { clipIndex: parseInt(m[1], 10) - 1, level: 0.5 } }, confidence: 0.8, rawCommand };
  }

  // ── Merge ──
  // "merge clips 1 and 2"
  m = cmd.match(/^merge\s+clips\s+(\d+)\s+(?:and|with)\s+(\d+)$/);
  if (m) {
    return { operation: { type: 'merge', params: { indexA: parseInt(m[1], 10) - 1, indexB: parseInt(m[2], 10) - 1 } }, confidence: 1.0, rawCommand };
  }
  // "merge all clips"
  m = cmd.match(/^merge\s+all\s+clips$/);
  if (m) {
    return { operation: { type: 'merge', params: { all: true } }, confidence: 1.0, rawCommand };
  }

  // ── Duplicate ──
  // "duplicate clip 3"
  m = cmd.match(/^duplicate\s+clip\s+(\d+)$/);
  if (m) {
    return { operation: { type: 'duplicate', params: { clipIndex: parseInt(m[1], 10) - 1 } }, confidence: 1.0, rawCommand };
  }
  // "copy clip 1 to end"
  m = cmd.match(/^copy\s+clip\s+(\d+)\s+to\s+(?:end|the\s+end)$/);
  if (m) {
    return { operation: { type: 'duplicate', params: { clipIndex: parseInt(m[1], 10) - 1, toEnd: true } }, confidence: 1.0, rawCommand };
  }

  // ── Label ──
  // "label clip 2 as 'Product Demo'" — preserve original case from rawCommand
  const labelMatch = rawCommand.trim().match(/^label\s+clip\s+(\d+)\s+as\s+['"](.+?)['"]$/i);
  if (labelMatch) {
    return { operation: { type: 'label', params: { clipIndex: parseInt(labelMatch[1], 10) - 1, label: labelMatch[2] } }, confidence: 1.0, rawCommand };
  }

  // No match — return unknown operation with low confidence
  return { operation: { type: 'trim', params: {} }, confidence: 0, rawCommand };
}

// ── Operation execution ──

/**
 * Execute a clip operation on an array of clips.
 * Returns a new array (does not mutate the input).
 */
export function executeOperation(clips: Clip[], operation: ClipOperation): Clip[] {
  switch (operation.type) {
    case 'trim':
      return executeTrim(clips, operation.params);
    case 'split':
      return executeSplit(clips, operation.params);
    case 'delete':
      return executeDelete(clips, operation.params);
    case 'reorder':
      return executeReorder(clips, operation.params);
    case 'add':
      return executeAdd(clips, operation.params);
    case 'speed':
      return executeSpeed(clips, operation.params);
    case 'volume':
      return executeVolume(clips, operation.params);
    case 'merge':
      return executeMerge(clips, operation.params);
    case 'duplicate':
      return executeDuplicate(clips, operation.params);
    case 'label':
      return executeLabel(clips, operation.params);
    default:
      return clips;
  }
}

function executeTrim(clips: Clip[], params: Record<string, unknown>): Clip[] {
  const position = params.position as string | undefined;
  const amount = (params.amount as number) || 0;
  const clipIndex = params.clipIndex as number | undefined;
  const targetDuration = params.targetDuration as number | undefined;

  if (clipIndex !== undefined && targetDuration !== undefined) {
    return clips.map((clip, i) => {
      if (i !== clipIndex) return clip;
      const newDuration = Math.max(0.1, targetDuration);
      return { ...clip, duration: newDuration, endTime: clip.startTime + newDuration };
    });
  }

  if (position === 'start') {
    return reindexTimeline(
      clips.map((clip) => {
        const trimAmount = Math.min(amount, clip.duration - 0.1);
        const newDuration = clip.duration - trimAmount;
        return { ...clip, duration: newDuration, endTime: clip.startTime + newDuration };
      }),
    );
  }

  if (position === 'end') {
    return clips.map((clip) => {
      const trimAmount = Math.min(amount, clip.duration - 0.1);
      const newDuration = clip.duration - trimAmount;
      return { ...clip, duration: newDuration, endTime: clip.startTime + newDuration };
    });
  }

  return clips;
}

function executeSplit(clips: Clip[], params: Record<string, unknown>): Clip[] {
  const at = (params.at as number) || 0;
  const clipIndex = params.clipIndex as number | undefined;

  // Find the clip to split
  let targetIdx: number;
  if (clipIndex !== undefined) {
    targetIdx = clipIndex;
  } else {
    targetIdx = clips.findIndex((clip) => at >= clip.startTime && at < clip.endTime);
  }

  if (targetIdx === -1 || targetIdx >= clips.length) return clips;

  const target = clips[targetIdx];
  const splitOffset = at - target.startTime;
  if (splitOffset <= 0 || splitOffset >= target.duration) return clips;

  const firstHalf: Clip = {
    ...target,
    name: `${target.name} (1)`,
    endTime: at,
    duration: splitOffset,
  };
  const secondHalf: Clip = {
    ...target,
    id: `clip-split-${Date.now().toString(36)}`,
    name: `${target.name} (2)`,
    startTime: at,
    endTime: target.endTime,
    duration: target.duration - splitOffset,
  };

  return [...clips.slice(0, targetIdx), firstHalf, secondHalf, ...clips.slice(targetIdx + 1)];
}

function executeDelete(clips: Clip[], params: Record<string, unknown>): Clip[] {
  const clipIndex = params.clipIndex as number | undefined;
  const position = params.position as string | undefined;
  const rangeStart = params.rangeStart as number | undefined;
  const rangeEnd = params.rangeEnd as number | undefined;

  if (rangeStart !== undefined && rangeEnd !== undefined) {
    const result = clips.filter((_, i) => i < rangeStart || i > rangeEnd);
    return reindexTimeline(result);
  }

  if (position === 'first') {
    return reindexTimeline(clips.slice(1));
  }
  if (position === 'last') {
    return reindexTimeline(clips.slice(0, -1));
  }

  if (clipIndex !== undefined && clipIndex >= 0 && clipIndex < clips.length) {
    return reindexTimeline(clips.filter((_, i) => i !== clipIndex));
  }

  return clips;
}

function executeReorder(clips: Clip[], params: Record<string, unknown>): Clip[] {
  const fromIndex = params.fromIndex as number | undefined;
  const toIndex = params.toIndex as number | undefined;
  const swap = params.swap as boolean | undefined;
  const indexA = params.indexA as number | undefined;
  const indexB = params.indexB as number | undefined;

  if (swap && indexA !== undefined && indexB !== undefined) {
    const result = [...clips];
    [result[indexA], result[indexB]] = [result[indexB], result[indexA]];
    return reindexTimeline(result);
  }

  if (fromIndex !== undefined && toIndex !== undefined && fromIndex >= 0 && fromIndex < clips.length) {
    const result = [...clips];
    const [moved] = result.splice(fromIndex, 1);
    result.splice(Math.min(toIndex, result.length), 0, moved);
    return reindexTimeline(result);
  }

  return clips;
}

function executeAdd(clips: Clip[], params: Record<string, unknown>): Clip[] {
  const clipType = (params.clipType as ClipType) || 'video';
  const at = (params.at as number) || 0;
  const text = params.text as string | undefined;

  const insertIdx = clips.findIndex((clip) => at >= clip.startTime && at < clip.endTime);
  const newClip = createClip({
    type: clipType,
    name: text || `${clipType} clip`,
    label: text || '',
    duration: clipType === 'transition' ? 0.5 : clipType === 'text' ? 2 : 5,
  });

  if (insertIdx === -1) {
    return [...clips, newClip];
  }

  const result = [...clips];
  result.splice(insertIdx + 1, 0, newClip);
  return reindexTimeline(result);
}

function executeSpeed(clips: Clip[], params: Record<string, unknown>): Clip[] {
  const clipIndex = params.clipIndex as number | undefined;
  const factor = (params.factor as number) || 1;

  if (clipIndex === undefined || clipIndex < 0 || clipIndex >= clips.length) return clips;

  return clips.map((clip, i) => {
    if (i !== clipIndex) return clip;
    const newDuration = clip.duration / factor;
    return { ...clip, duration: newDuration, endTime: clip.startTime + newDuration, notes: `${clip.notes} [speed: ${factor}x]`.trim() };
  });
}

function executeVolume(clips: Clip[], params: Record<string, unknown>): Clip[] {
  const clipIndex = params.clipIndex as number | undefined;
  const level = params.level as number | undefined;

  if (clipIndex === undefined || clipIndex < 0 || clipIndex >= clips.length) return clips;

  return clips.map((clip, i) => {
    if (i !== clipIndex) return clip;
    const levelNote = level === 0 ? 'muted' : `volume: ${Math.round((level ?? 1) * 100)}%`;
    return { ...clip, notes: `${clip.notes} [${levelNote}]`.trim() };
  });
}

function executeMerge(clips: Clip[], params: Record<string, unknown>): Clip[] {
  const all = params.all as boolean | undefined;
  const indexA = params.indexA as number | undefined;
  const indexB = params.indexB as number | undefined;

  if (all) {
    if (clips.length <= 1) return clips;
    const totalDuration = calculateTotalDuration(clips);
    return [createClip({
      name: 'Merged clip',
      duration: totalDuration,
      type: clips[0].type,
      source: clips[0].source,
      notes: `Merged from ${clips.length} clips`,
    })];
  }

  if (indexA !== undefined && indexB !== undefined && indexA >= 0 && indexB < clips.length && indexA < indexB) {
    const merged = createClip({
      name: `${clips[indexA].name} + ${clips[indexB].name}`,
      duration: clips[indexA].duration + clips[indexB].duration,
      type: clips[indexA].type,
      source: clips[indexA].source,
      notes: `Merged clips ${indexA + 1} and ${indexB + 1}`,
    });
    return [...clips.slice(0, indexA), merged, ...clips.slice(indexB + 1)];
  }

  return clips;
}

function executeDuplicate(clips: Clip[], params: Record<string, unknown>): Clip[] {
  const clipIndex = params.clipIndex as number | undefined;
  const toEnd = params.toEnd as boolean | undefined;

  if (clipIndex === undefined || clipIndex < 0 || clipIndex >= clips.length) return clips;

  const original = clips[clipIndex];
  const duplicate = createClip({
    ...original,
    id: `clip-dup-${Date.now().toString(36)}`,
    name: `${original.name} (copy)`,
  });

  if (toEnd) {
    return [...clips, duplicate];
  }

  const result = [...clips];
  result.splice(clipIndex + 1, 0, duplicate);
  return reindexTimeline(result);
}

function executeLabel(clips: Clip[], params: Record<string, unknown>): Clip[] {
  const clipIndex = params.clipIndex as number | undefined;
  const label = params.label as string | undefined;

  if (clipIndex === undefined || clipIndex < 0 || clipIndex >= clips.length || !label) return clips;

  return clips.map((clip, i) => (i === clipIndex ? { ...clip, label } : clip));
}

// ── Validation ──

export function validateClipEditorRequest(input: {
  command?: string;
  clips?: Clip[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.command || typeof input.command !== 'string' || input.command.trim().length === 0) {
    errors.push('Command is required');
  }
  if (input.command && input.command.length > 500) {
    errors.push('Command must be at most 500 characters');
  }
  if (!input.clips || !Array.isArray(input.clips)) {
    errors.push('Clips array is required');
  }
  if (input.clips && input.clips.length > 100) {
    errors.push('Maximum 100 clips allowed');
  }
  return { valid: errors.length === 0, errors };
}

// ── Operation descriptions ──

export function describeOperation(operation: ClipOperation): string {
  switch (operation.type) {
    case 'trim': {
      const pos = operation.params.position as string;
      const amt = operation.params.amount as number;
      const idx = operation.params.clipIndex as number;
      const target = operation.params.targetDuration as number;
      if (idx !== undefined && target !== undefined) return `Trimmed clip ${idx + 1} to ${target}s`;
      return `Trimmed ${amt}s from the ${pos} of all clips`;
    }
    case 'split': {
      const at = operation.params.at as number;
      return `Split at ${formatTimecode(at)}`;
    }
    case 'delete': {
      const idx = operation.params.clipIndex as number;
      const pos = operation.params.position as string;
      if (pos) return `Deleted the ${pos} clip`;
      return `Deleted clip ${idx + 1}`;
    }
    case 'reorder': {
      const from = operation.params.fromIndex as number;
      const to = operation.params.toIndex as number;
      const swap = operation.params.swap as boolean;
      if (swap) return `Swapped clips ${(operation.params.indexA as number) + 1} and ${(operation.params.indexB as number) + 1}`;
      return `Moved clip ${from + 1} to position ${to + 1}`;
    }
    case 'add': {
      const type = operation.params.clipType as string;
      return `Added ${type} clip`;
    }
    case 'speed': {
      const factor = operation.params.factor as number;
      const idx = operation.params.clipIndex as number;
      return `${factor > 1 ? 'Sped up' : 'Slowed down'} clip ${idx + 1} by ${factor}x`;
    }
    case 'volume': {
      const idx = operation.params.clipIndex as number;
      const level = operation.params.level as number;
      return `${level === 0 ? 'Muted' : 'Adjusted volume on'} clip ${idx + 1}`;
    }
    case 'merge': {
      const all = operation.params.all as boolean;
      if (all) return 'Merged all clips';
      return `Merged clips ${(operation.params.indexA as number) + 1} and ${(operation.params.indexB as number) + 1}`;
    }
    case 'duplicate': {
      const idx = operation.params.clipIndex as number;
      return `Duplicated clip ${idx + 1}`;
    }
    case 'label': {
      const idx = operation.params.clipIndex as number;
      const label = operation.params.label as string;
      return `Labeled clip ${idx + 1} as "${label}"`;
    }
    default:
      return 'Unknown operation';
  }
}

// ── Main processing function ──

/**
 * Process a natural language clip editing command.
 * Tries the deterministic parser first; if confidence is low, falls back
 * to AI-enhanced parsing via atlasChat.
 */
export async function processClipCommand(input: {
  command: string;
  clips: Clip[];
  currentTimecode?: number;
  planTier?: PlanTier;
}): Promise<ClipEditResult> {
  const { command, clips, planTier } = input;

  // Try deterministic parser first
  const parsed = parseCommand(command);

  if (parsed.confidence >= 0.8) {
    const newClips = executeOperation(clips, parsed.operation);
    const affectedIds = getAffectedClipIds(clips, newClips);
    return {
      clips: newClips,
      operation: parsed.operation,
      description: describeOperation(parsed.operation),
      affectedClipIds: affectedIds,
      success: true,
    };
  }

  // Fall back to AI-enhanced parsing (skip in dry-run mode)
  if (!isDryRun()) {
  try {
    const model = getLLMModel(planTier);
    const clipsContext = clips.map((c, i) => `Clip ${i + 1}: "${c.name}" (${c.type}, ${c.duration}s, ${formatTimecode(c.startTime)}-${formatTimecode(c.endTime)})`).join('\n');

    const prompt = `You are a video editing assistant. Parse the user's command into a JSON clip operation.

Available clips:
${clipsContext}

Command: "${command}"

Respond with JSON only:
{"type": "trim|split|delete|reorder|add|speed|volume|merge|duplicate|label", "params": {...}}

For "trim": params can be {position: "start"|"end", amount: number} or {clipIndex: number, targetDuration: number}
For "split": params are {at: number} or {clipIndex: number, at: number}
For "delete": params can be {clipIndex: number} or {position: "first"|"last"} or {rangeStart: number, rangeEnd: number}
For "reorder": params can be {fromIndex: number, toIndex: number} or {swap: true, indexA: number, indexB: number}
For "add": params are {clipType: "transition"|"text"|"video"|"audio"|"image"|"effect", at: number, text?: string}
For "speed": params are {clipIndex: number, factor: number}
For "volume": params are {clipIndex: number, level: number}
For "merge": params can be {all: true} or {indexA: number, indexB: number}
For "duplicate": params are {clipIndex: number, toEnd?: boolean}
For "label": params are {clipIndex: number, label: string}

Use 0-based indices for clipIndex, fromIndex, toIndex, indexA, indexB.`;

    const response = await atlasChat(
      [{ role: 'user', content: prompt }],
      model,
      300,
      15000,
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ClipOperation;
      const newClips = executeOperation(clips, parsed);
      const affectedIds = getAffectedClipIds(clips, newClips);
      return {
        clips: newClips,
        operation: parsed,
        description: describeOperation(parsed),
        affectedClipIds: affectedIds,
        success: true,
      };
    }
  } catch {
    // Fall through to fallback
  }
  } // end if (!isDryRun())

  // Fallback: return unchanged clips
  return {
    clips,
    operation: { type: 'trim', params: {} },
    description: 'Could not parse command. Please try rephrasing.',
    affectedClipIds: [],
    success: false,
    dryRun: true,
  };
}

function getAffectedClipIds(oldClips: Clip[], newClips: Clip[]): string[] {
  const oldIds = new Set(oldClips.map((c) => c.id));
  return newClips.filter((c) => !oldIds.has(c.id)).map((c) => c.id);
}
