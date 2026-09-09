import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OnboardingService } from '@/lib/services/onboarding-service';

/** POST /api/employee-development/onboarding/templates/[id]/apply — apply a template */
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
  const employeeId = String(body.employeeId || '').trim();
  if (!employeeId) {
    return NextResponse.json({ error: 'employeeId_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const tasks = await OnboardingService.applyTemplate(organizationId, employeeId, id);
    return NextResponse.json({ tasks }, { status: 201 });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'template_not_found') {
      return NextResponse.json({ error: 'template_not_found' }, { status: 404 });
    }
    console.error('[employee-development/onboarding/templates/apply] error:', e);
    return NextResponse.json({ error: 'failed_to_apply_template' }, { status: 500 });
  }
}
