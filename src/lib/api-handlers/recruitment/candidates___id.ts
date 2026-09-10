import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecruitmentService } from '@/lib/services/recruitment-service';

/** GET /api/recruitment/candidates/[id] — get a single candidate */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const candidate = await RecruitmentService.getCandidate(id);
  if (!candidate) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ candidate });
}

/** PATCH /api/recruitment/candidates/[id] — update a candidate */
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
    const candidate = await RecruitmentService.updateCandidate(id, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      resumeUrl: body.resumeUrl,
      resumeText: body.resumeText,
      linkedinUrl: body.linkedinUrl,
      portfolioUrl: body.portfolioUrl,
      source: body.source,
      status: body.status,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      notes: body.notes,
      jobPostingId: body.jobPostingId,
    });
    return NextResponse.json({ candidate });
  } catch (e) {
    console.error('[recruitment/candidates] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_candidate' }, { status: 500 });
  }
}

/** DELETE /api/recruitment/candidates/[id] — delete a candidate */
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
    await RecruitmentService.deleteCandidate(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[recruitment/candidates] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_candidate' }, { status: 500 });
  }
}
