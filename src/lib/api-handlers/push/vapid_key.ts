import { NextResponse } from 'next/server';
import { PushNotificationService } from '@/lib/services/push-notification-service';

/**
 * GET /api/push/vapid-key — return the VAPID public key for the client.
 */
export async function GET() {
  const publicKey = PushNotificationService.getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: 'not_configured', publicKey: null },
      { status: 200 },
    );
  }
  return NextResponse.json({ publicKey });
}
