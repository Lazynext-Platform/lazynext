import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ApiKeyService } from '@/lib/services/api-key-service';

/** POST /api/platform/keys/[id]/revoke — revoke an API key */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const key = await ApiKeyService.revoke(id, session.user.id);
    return NextResponse.json({ key });
  } catch (e) {
    console.error('[platform/keys] revoke error:', e);
    return NextResponse.json({ error: 'failed_to_revoke_key' }, { status: 500 });
  }
}
