import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmployeeDevelopmentService } from '@/lib/services/employee-development-service';

/** GET /api/employee-development/certifications/[id] — get a single certification */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const certification = await EmployeeDevelopmentService.getCertification(id);
  if (!certification) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ certification });
}

/** PATCH /api/employee-development/certifications/[id] — update a certification */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const certification = await EmployeeDevelopmentService.updateCertification(id, {
      name: body.name,
      issuer: body.issuer,
      issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      credentialId: body.credentialId,
      credentialUrl: body.credentialUrl,
      status: body.status,
    });
    return NextResponse.json({ certification });
  } catch (e) {
    console.error('[employee-development/certifications] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_certification' }, { status: 500 });
  }
}

/** DELETE /api/employee-development/certifications/[id] — delete a certification */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await EmployeeDevelopmentService.deleteCertification(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[employee-development/certifications] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_certification' }, { status: 500 });
  }
}
