import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TrainingService } from '@/lib/services/training-service';

/** POST /api/training/certifications/[id]/revoke — revoke a certification */
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
  const reason = String(body.reason || '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  try {
    const certification = await TrainingService.revokeCertification(id, reason, session.user.id);
    if (!certification) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ certification });
  } catch (e) {
    console.error('[training/certifications/revoke] error:', e);
    return NextResponse.json({ error: 'failed_to_revoke_certification' }, { status: 500 });
  }
}
