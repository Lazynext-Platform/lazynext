import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeDevelopmentService } from '@/lib/services/employee-development-service';

/** GET /api/employee-development/certifications — list certifications */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ certifications: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { employeeId?: string; status?: string } = {};
  const employeeId = url.searchParams.get('employeeId');
  const status = url.searchParams.get('status');
  if (employeeId) opts.employeeId = employeeId;
  if (status) opts.status = status;

  const certifications = await EmployeeDevelopmentService.listCertifications(organizationId, opts);
  return NextResponse.json({ certifications });
}

/** POST /api/employee-development/certifications — create a certification */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const issuer = String(body.issuer || '').trim();
  const employeeId = String(body.employeeId || '').trim();
  if (!name || !issuer || !employeeId) {
    return NextResponse.json({ error: 'name_issuer_and_employeeId_required' }, { status: 400 });
  }
  if (!body.issueDate) {
    return NextResponse.json({ error: 'issueDate_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const certification = await EmployeeDevelopmentService.createCertification(organizationId, {
      employeeId,
      name,
      issuer,
      issueDate: new Date(body.issueDate),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      credentialId: body.credentialId,
      credentialUrl: body.credentialUrl,
      status: body.status,
    });
    return NextResponse.json({ certification }, { status: 201 });
  } catch (e) {
    console.error('[employee-development/certifications] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_certification' }, { status: 500 });
  }
}
