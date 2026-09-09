import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecruitmentService } from '@/lib/services/recruitment-service';
import { prisma } from '@/lib/prisma';

/** GET /api/recruitment/interviews/[id] — get a single interview */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const interview = await RecruitmentService.getInterview(id);
  if (!interview) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ interview });
}

/** PATCH /api/recruitment/interviews/[id] — update an interview */
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
    const interview = await RecruitmentService.updateInterview(id, {
      type: body.type,
      status: body.status,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      duration: body.duration,
      location: body.location,
      interviewerIds: Array.isArray(body.interviewerIds) ? body.interviewerIds : undefined,
    });
    return NextResponse.json({ interview });
  } catch (e) {
    console.error('[recruitment/interviews] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_interview' }, { status: 500 });
  }
}

/** DELETE /api/recruitment/interviews/[id] — delete an interview */
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
    await prisma.interview.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[recruitment/interviews] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_interview' }, { status: 500 });
  }
}
