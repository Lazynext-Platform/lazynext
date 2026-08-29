import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import { parseEditCommand, applyCommand, type ParsedEditCommand } from '@/lib/editor/conversational';
import { validateTimeline } from '@/lib/editor/timeline-builder';
import type { Timeline } from '@/lib/editor/types';

export const maxDuration = 30;

const COST = 1;

const SYSTEM_PROMPT = `You are a video editing assistant. The user gives a natural-language editing command. Interpret it and return a JSON object describing the edit operation.

Available operations:
- trim: { type: "trim", params: { position: "first"|"last"|"to", seconds: number } }
- speed: { type: "speed", params: { factor: number } }
- volume: { type: "volume", params: { action: "mute"|"set"|"adjust", value?: number, delta?: number } }
- transition: { type: "transition", params: { transitionType: "fade"|"dissolve"|"cut"|"wipe"|"slide", atSec?: number, durationSec?: number } }
- marker: { type: "marker", params: { atSec: number, label?: string, color?: string } }
- caption: { type: "caption", params: { text: string, atSec?: number } }
- delete: { type: "delete", params: { target: "clip"|"track", atSec?: number, trackType?: string } }
- split: { type: "split", params: { atSec: number } }

Return ONLY the JSON object, no explanation.`;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const timeline = body.timeline as Timeline | undefined;

  if (!message) return NextResponse.json({ error: 'message_required' }, { status: 400 });

  // Try direct regex parse first
  const direct = parseEditCommand(message);

  let command: ParsedEditCommand;
  let usedAI = false;

  if (direct.confidence >= 0.8) {
    command = direct;
  } else {
    // Use AI for ambiguous commands
    usedAI = true;
    try {
      await deductCredits(uid, COST, 'editor:chat');
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
        { status: 402 },
      );
    }

    try {
      const model = getLLMModel(planTier);
      const timelineContext = timeline
        ? `Timeline: ${timeline.name}, ${timeline.durationSec}s, ${timeline.tracks.length} tracks, ratio ${timeline.ratio}`
        : 'No timeline context provided.';
      const aiResponse = await atlasChat(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Timeline context: ${timelineContext}\n\nUser command: "${message}"` },
        ],
        model,
        500,
        15000,
      );
      // Parse AI response as command
      const parsed = JSON.parse(aiResponse);
      command = {
        type: parsed.type || 'unknown',
        params: parsed.params || {},
        confidence: 0.7,
        originalText: message,
      };
    } catch (e) {
      await refundCredits(uid, COST, 'editor:chat');
      // Fall back to direct parse even if low confidence
      command = direct;
    }
  }

  // Apply command to timeline if provided
  let updatedTimeline: Timeline | undefined;
  if (timeline && command.type !== 'unknown') {
    try {
      updatedTimeline = applyCommand(timeline, command);
      const validation = validateTimeline(updatedTimeline);
      if (!validation.valid) {
        return NextResponse.json({
          response: `Command parsed but resulted in invalid timeline: ${validation.errors.join(', ')}`,
          command,
          updatedTimeline: undefined,
        });
      }
    } catch (e) {
      console.error('[editor/chat] apply command error:', e instanceof Error ? e.message : String(e));
      return NextResponse.json({
        response: `Failed to apply command. Please try a different instruction.`,
        command,
        updatedTimeline: undefined,
      });
    }
  }

  const responseText = command.type === 'unknown'
    ? `I couldn't understand that command. Try things like "trim first 5 seconds", "speed up 2x", "mute audio", "add fade transition", or "add marker at 10s".`
    : `Applied: ${command.type} command${usedAI ? ' (AI-assisted)' : ' (direct match)'}`;

  return NextResponse.json({
    response: responseText,
    command,
    updatedTimeline,
  });
}

export const POST = withAtlas(__byokPOST);
