import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getTool, validateAgainstSchema, executeTool, CREATIVE_TOOL_COSTS } from '@/lib/creative/tools';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';

export const maxDuration = 60;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const toolName = typeof body.tool === 'string' ? body.tool : '';
  const input = body.input;

  if (!toolName) return NextResponse.json({ error: 'tool_required' }, { status: 400 });
  if (input === undefined) return NextResponse.json({ error: 'input_required' }, { status: 400 });

  const tool = getTool(toolName);
  if (!tool) {
    return NextResponse.json({ error: 'tool_not_found', detail: `Unknown tool: ${toolName}` }, { status: 404 });
  }

  // Validate input against the tool's JSON schema
  const validationErrors = validateAgainstSchema(input, tool.inputSchema);
  if (validationErrors.length > 0) {
    return NextResponse.json({ error: 'validation_failed', detail: validationErrors }, { status: 400 });
  }

  // Deduct credits based on the tool's cost
  const cost = CREATIVE_TOOL_COSTS[toolName as keyof typeof CREATIVE_TOOL_COSTS] || 0;
  if (cost > 0) {
    try {
      await deductCredits(uid, cost, `creative:tool:${toolName}`);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed',
        },
        { status: 402 },
      );
    }
  }

  try {
    const result = await executeTool(toolName, input, { userId: uid });
    if (!result.ok) {
      // executeTool swallows errors internally and returns a ToolResult with ok:false.
      // Refund any credits we charged since execution did not succeed.
      if (cost > 0) await refundSync(uid, cost, `creative:tool:${toolName}`);
      return NextResponse.json({ error: 'execution_failed', detail: result.error }, { status: 500 });
    }
    return NextResponse.json({ tool: toolName, result: result.output, cost });
  } catch (e) {
    if (cost > 0) await refundSync(uid, cost, `creative:tool:${toolName}`);
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[creative/tools/execute] ${toolName} error:`, message);
    return NextResponse.json({ error: 'execution_failed', detail: message }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
