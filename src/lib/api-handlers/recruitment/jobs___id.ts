import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** GET /api/recruitment/jobs/[id] — get a single job posting */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const job = await RecruitmentService.getJobPosting(id);
  if (!job) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ job });
}

/** PATCH /api/recruitment/jobs/[id] — update a job posting */
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
    const job = await RecruitmentService.updateJobPosting(id, {
      title: body.title,
      department: body.department,
      description: body.description,
      requirements: Array.isArray(body.requirements) ? body.requirements : undefined,
      responsibilities: Array.isArray(body.responsibilities) ? body.responsibilities : undefined,
      location: body.location,
      type: body.type,
      status: body.status,
      salaryMin: body.salaryMin,
      salaryMax: body.salaryMax,
      currency: body.currency,
      hiringManagerId: body.hiringManagerId,
    });
    return NextResponse.json({ job });
  } catch (e) {
    console.error('[recruitment/jobs] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_job' }, { status: 500 });
  }
}

/** DELETE /api/recruitment/jobs/[id] — delete a job posting */
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
    await RecruitmentService.deleteJobPosting(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[recruitment/jobs] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_job' }, { status: 500 });
  }
}
