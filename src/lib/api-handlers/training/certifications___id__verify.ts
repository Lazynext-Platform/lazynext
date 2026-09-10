import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TrainingService } from '@/lib/services/training-service';

/** POST /api/training/certifications/[id]/verify — verify a certification */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const certification = await TrainingService.verifyCertification(id, session.user.id);
    if (!certification) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ certification });
  } catch (e) {
    console.error('[training/certifications/verify] error:', e);
    return NextResponse.json({ error: 'failed_to_verify_certification' }, { status: 500 });
  }
}
