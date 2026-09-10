import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GdprService } from '@/lib/services/gdpr-service';

/** GET /api/data/gdpr/consent — get consent records for a user */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || session.user.id;
  const consentType = searchParams.get('consentType') as 'marketing' | 'analytics' | 'functional' | 'necessary' | null;

  const consent = await GdprService.getConsentRecord(userId, consentType || undefined);
  return NextResponse.json({ consent });
}

/** PATCH /api/data/gdpr/consent — update consent for a user */
export async function PATCH(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const consent = await GdprService.updateConsent({
      userId: String(body.userId || session.user.id),
      consentType: String(body.consentType || 'necessary') as 'marketing' | 'analytics' | 'functional' | 'necessary',
      granted: Boolean(body.granted),
      organizationId: body.organizationId,
      workspaceId: body.workspaceId,
      metadata: body.metadata,
    });
    return NextResponse.json({ consent });
  } catch (e) {
    console.error('[data/gdpr/consent] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_consent' }, { status: 500 });
  }
}
