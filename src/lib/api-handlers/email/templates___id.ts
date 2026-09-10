import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmailTemplateService } from '@/lib/services/email-template-service';

/** GET /api/email/templates/[id] — get a single template */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const template = await EmailTemplateService.get(id);
  if (!template) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ template });
}

/** PATCH /api/email/templates/[id] — update a template */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const template = await EmailTemplateService.update(id, {
      name: body.name,
      category: body.category,
      subject: body.subject,
      preheader: body.preheader,
      bodyHtml: body.bodyHtml,
      bodyText: body.bodyText,
      variables: body.variables,
      thumbnail: body.thumbnail,
      isDefault: body.isDefault,
    });
    return NextResponse.json({ template });
  } catch (e) {
    console.error('[email/templates/[id]] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_template' }, { status: 500 });
  }
}

/** DELETE /api/email/templates/[id] — delete a template */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await EmailTemplateService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[email/templates/[id]] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_template' }, { status: 500 });
  }
}
