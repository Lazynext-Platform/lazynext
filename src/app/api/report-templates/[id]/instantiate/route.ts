import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ReportTemplateService } from '@/lib/services/report-template-service';
import { ReportBuilderService } from '@/lib/services/report-builder-service';
import { WorkspaceService } from '@/lib/services/workspace';

/** POST /api/report-templates/[id]/instantiate — instantiate a template into a custom report */
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

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const definition = await ReportTemplateService.instantiate(id, {
      name: body.name,
      description: body.description,
      createdBy: session.user.id,
    });
    if (!definition) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const report = await ReportBuilderService.create(organizationId, {
      ...definition,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (e) {
    console.error('[report-templates/instantiate] error:', e);
    return NextResponse.json({ error: 'failed_to_instantiate_template' }, { status: 500 });
  }
}
