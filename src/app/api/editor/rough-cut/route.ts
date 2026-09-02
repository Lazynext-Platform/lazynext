import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateRoughCut,
  exportCutPlanAsJSON,
  exportCutPlanAsEDL,
  exportCutPlanAsFCPXML,
  exportCutPlanAsPremiereXML,
  exportCutPlanAsDaVinciXML,
  exportCutPlanAsSRT,
  applySkillsToPlan,
  type RoughCutOptions,
} from '@/lib/editor/transcript-cut';
import { getSkill } from '@/lib/editor/skills';
import { prisma } from '@/lib/prisma';
import type { ASRResult } from '@/lib/providers/types';

export const maxDuration = 60;

/**
 * POST /api/editor/rough-cut
 * Body: { transcript: ASRResult, options?: RoughCutOptions, format?: 'json' | 'edl' | 'fcpxml' | 'premiere' | 'davinci' | 'srt' }
 * Returns a rough cut plan derived from the transcript.
 * No credit cost — this is a pure computation, no AI calls.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const transcript = body.transcript as ASRResult | undefined;
  if (!transcript || !transcript.text) {
    return NextResponse.json({ error: 'transcript_required', detail: 'transcript with text field is required' }, { status: 400 });
  }

  if (!transcript.segments || !Array.isArray(transcript.segments)) {
    return NextResponse.json({ error: 'segments_required', detail: 'transcript.segments array is required' }, { status: 400 });
  }

  const opts: RoughCutOptions = {
    targetDurationSec: typeof body.options?.targetDurationSec === 'number' ? body.options.targetDurationSec : undefined,
    minSegmentSec: typeof body.options?.minSegmentSec === 'number' ? body.options.minSegmentSec : 1.5,
    maxPauseSec: typeof body.options?.maxPauseSec === 'number' ? body.options.maxPauseSec : 2.0,
    removeFillers: body.options?.removeFillers !== false,
  };

  try {
    const basePlan = generateRoughCut(transcript, opts);
    const validFormats = ['json', 'edl', 'fcpxml', 'premiere', 'davinci', 'srt'] as const;
    type ExportFormat = (typeof validFormats)[number];
    const requested = typeof body.format === 'string' ? body.format : 'json';
    const format: ExportFormat = (validFormats as readonly string[]).includes(requested)
      ? (requested as ExportFormat)
      : 'json';
    const sourceName = body.sourceName || 'SOURCE';

    // Apply editing skills if requested
    const skillIds: string[] = Array.isArray(body.skillIds) ? body.skillIds.filter((s: unknown) => typeof s === 'string') : [];
    const skillsToApply: Array<{ name: string; steps: Array<{ order: number; action: string; trigger: string; description: string; params?: Record<string, unknown> }> }> = [];

    for (const skillId of skillIds) {
      // Check built-in skills first
      const builtin = getSkill(skillId);
      if (builtin) {
        skillsToApply.push({ name: builtin.name, steps: builtin.steps });
        continue;
      }
      // Check user-persisted skills (ownership verified)
      const persisted = await prisma.editingSkill.findFirst({ where: { id: skillId, userId: session.user.id } });
      if (persisted) {
        skillsToApply.push({
          name: persisted.name,
          steps: JSON.parse(persisted.stepsJson || '[]'),
        });
      }
    }

    const plan = skillsToApply.length > 0 ? applySkillsToPlan(basePlan, skillsToApply) : basePlan;

    if (format === 'edl') {
      const edl = exportCutPlanAsEDL(plan, sourceName);
      return NextResponse.json({ plan, edl, format: 'edl' });
    }

    if (format === 'fcpxml') {
      const fcpxml = exportCutPlanAsFCPXML(plan, sourceName);
      return NextResponse.json({ plan, fcpxml, format: 'fcpxml' });
    }

    if (format === 'premiere') {
      const premiere = exportCutPlanAsPremiereXML(plan, sourceName);
      return NextResponse.json({ plan, premiere, format: 'premiere' });
    }

    if (format === 'davinci') {
      const davinci = exportCutPlanAsDaVinciXML(plan, sourceName);
      return NextResponse.json({ plan, davinci, format: 'davinci' });
    }

    if (format === 'srt') {
      const srt = exportCutPlanAsSRT(plan);
      return NextResponse.json({ plan, srt, format: 'srt' });
    }

    const json = exportCutPlanAsJSON(plan);
    return NextResponse.json({ plan, json, format: 'json' });
  } catch (e) {
    console.error('[editor/rough-cut] error:', String(e));
    return NextResponse.json({ error: 'rough_cut_failed' }, { status: 500 });
  }
}
