import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IPService } from '@/lib/services/ip-service';

/** POST /api/ip/licenses/[id]/terminate — terminate an IP license */
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
  const reason = String(body.reason || '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  try {
    const license = await IPService.terminateLicense(id, reason, session.user.id);
    if (!license) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ license });
  } catch (e) {
    console.error('[ip/licenses/terminate] error:', e);
    return NextResponse.json({ error: 'failed_to_terminate_license' }, { status: 500 });
  }
}
