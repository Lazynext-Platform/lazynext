import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmployeeService } from '@/lib/services/employee-service';

/** GET /api/hr/employees — list employees */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ employees: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const { searchParams } = new URL(req.url);
  const filters: Record<string, string | undefined> = {};
  const department = searchParams.get('department') || undefined;
  const status = searchParams.get('status') || undefined;
  const managerId = searchParams.get('managerId') || undefined;
  const workspaceId = searchParams.get('workspaceId') || undefined;
  const search = searchParams.get('search') || undefined;
  if (department) filters.department = department;
  if (status) filters.status = status;
  if (managerId) filters.managerId = managerId;
  if (workspaceId) filters.workspaceId = workspaceId;
  if (search) filters.search = search;

  const employees = await EmployeeService.list(organizationId, filters);
  return NextResponse.json({ employees });
}

/** POST /api/hr/employees — create an employee */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const email = String(body.email || '').trim();
  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: 'first_last_email_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const employee = await EmployeeService.create({
      organizationId,
      workspaceId: body.workspaceId,
      userId: body.userId,
      employeeId: body.employeeId,
      firstName,
      lastName,
      email,
      phone: body.phone,
      avatar: body.avatar,
      position: body.position,
      department: body.department,
      managerId: body.managerId,
      employmentType: body.employmentType,
      status: body.status,
      hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
      salary: body.salary,
      salaryCurrency: body.salaryCurrency,
      payFrequency: body.payFrequency,
      location: body.location,
      timezone: body.timezone,
      address: body.address,
      emergencyContact: body.emergencyContact,
      documents: body.documents,
      skills: body.skills,
      notes: body.notes,
    });
    return NextResponse.json({ employee }, { status: 201 });
  } catch (e) {
    console.error('[hr/employees] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_employee' }, { status: 500 });
  }
}
