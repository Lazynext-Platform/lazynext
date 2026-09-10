import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmployeeService } from '@/lib/services/employee-service';

/** GET /api/hr/employees/[id] — get a single employee */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const employee = await EmployeeService.get(id);
  if (!employee) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ employee });
}

/** PATCH /api/hr/employees/[id] — update an employee */
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
    const employee = await EmployeeService.update(id, {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      avatar: body.avatar,
      position: body.position,
      department: body.department,
      managerId: body.managerId,
      employmentType: body.employmentType,
      status: body.status,
      hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
      terminationDate: body.terminationDate ? new Date(body.terminationDate) : undefined,
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
    return NextResponse.json({ employee });
  } catch (e) {
    console.error('[hr/employees] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_employee' }, { status: 500 });
  }
}

/** DELETE /api/hr/employees/[id] — delete an employee */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await EmployeeService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[hr/employees] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_employee' }, { status: 500 });
  }
}
