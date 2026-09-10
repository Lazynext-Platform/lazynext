import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** POST /api/regulatory/requirements/[id]/assess — assess a requirement */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const assessment = String(body.assessment || '').trim();
  if (!assessment) {
    return NextResponse.json({ error: 'assessment_required' }, { status: 400 });
  }

  try {
    const requirement = await RegulatoryService.assessRequirement(id, assessment, session.user.id);
    if (!requirement) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ requirement });
  } catch (e) {
    console.error('[regulatory/requirements] assess error:', e);
    return NextResponse.json({ error: 'failed_to_assess_requirement' }, { status: 500 });
  }
}
