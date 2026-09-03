import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/settings/notifications — get the current user's notification preferences.
 * POST /api/settings/notifications — update notification preferences.
 *
 * Preferences are stored as a JSON string in User.notificationPrefs.
 * Format: { "type_name": { "inApp": bool, "email": bool }, ... }
 */

const VALID_TYPES = [
  'task_assigned',
  'task_completed',
  'project_created',
  'document_shared',
  'mention',
  'comment',
  'billing',
  'system',
];

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true },
  });

  let prefs: Record<string, { inApp: boolean; email: boolean }> = {};
  if (user?.notificationPrefs) {
    try {
      prefs = JSON.parse(user.notificationPrefs);
    } catch {}
  }

  // Ensure all types have defaults
  for (const type of VALID_TYPES) {
    if (!prefs[type]) {
      prefs[type] = { inApp: true, email: false };
    }
  }

  return NextResponse.json({ prefs });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, { inApp?: boolean; email?: boolean }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Validate and normalize
  const prefs: Record<string, { inApp: boolean; email: boolean }> = {};
  for (const [type, val] of Object.entries(body)) {
    if (!VALID_TYPES.includes(type)) continue;
    prefs[type] = {
      inApp: val.inApp ?? true,
      email: val.email ?? false,
    };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationPrefs: JSON.stringify(prefs) },
  });

  return NextResponse.json({ ok: true, prefs });
}
