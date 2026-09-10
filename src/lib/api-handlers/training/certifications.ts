import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TrainingService } from '@/lib/services/training-service';

/** GET /api/training/certifications — list certifications */
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
  const opts: { employeeName?: string; status?: string; issuer?: string } = {};
  const employeeName = url.searchParams.get('employeeName');
  const status = url.searchParams.get('status');
  const issuer = url.searchParams.get('issuer');
  if (employeeName) opts.employeeName = employeeName;
  if (status) opts.status = status;
  if (issuer) opts.issuer = issuer;

  const certifications = await TrainingService.listCertifications(organizationId, opts as never);
  return NextResponse.json({ certifications });
}

/** POST /api/training/certifications — create a certification */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const validFrom = String(body.validFrom || '').trim();
  if (!name || !validFrom) {
    return NextResponse.json({ error: 'name_validFrom_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const certification = await TrainingService.createCertification(
      ws.organizationId, ws.id,
      {
        name, validFrom,
        description: body.description, issuer: body.issuer, validTo: body.validTo,
        requirements: body.requirements, courseId: body.courseId,
        employeeName: body.employeeName, certificateNumber: body.certificateNumber,
        status: body.status, verifiedBy: body.verifiedBy, verifiedDate: body.verifiedDate,
      },
      session.user.id,
    );
    return NextResponse.json({ certification }, { status: 201 });
  } catch (e) {
    console.error('[training/certifications] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_certification' }, { status: 500 });
  }
}
