import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmailTemplateService } from '@/lib/services/email-template-service';

/** POST /api/email/templates/[id]/render — render a template with variables */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const variables: Record<string, string> = body.variables || {};

  try {
    const rendered = await EmailTemplateService.render(id, variables);
    return NextResponse.json({ rendered });
  } catch (e) {
    console.error('[email/templates/[id]/render] error:', e);
    return NextResponse.json({ error: 'failed_to_render' }, { status: 500 });
  }
}
