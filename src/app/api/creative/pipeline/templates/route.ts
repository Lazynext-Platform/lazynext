import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getPipelineTemplates } from '@/lib/creative/pipeline';

/**
 * GET /api/creative/pipeline/templates
 * Returns the built-in pipeline templates. Auth required; no credit cost.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  return NextResponse.json({ templates: getPipelineTemplates() });
}
