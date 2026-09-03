import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/data-request — submit a GDPR/data-subject access request.
 *
 * If the user is authenticated, the request is linked to their account.
 * If not, it's stored with just the email address.
 *
 * Validates the request type and email format.
 */
const VALID_TYPES = ['access', 'correction', 'deletion', 'portability', 'restriction', 'objection'];

export async function POST(req: NextRequest) {
  let body: { type?: string; email?: string; name?: string; details?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const type = body.type?.trim();
  const email = body.email?.trim().toLowerCase();

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  // Link to user if authenticated (optional — unauthenticated submissions allowed)
  const session = await auth().catch(() => null);
  const userId = session?.user?.id || null;

  try {
    const request = await prisma.dataRequest.create({
      data: {
        userId,
        type,
        email: email.slice(0, 254),
        name: body.name?.trim().slice(0, 200) || null,
        details: body.details?.trim().slice(0, 5000) || null,
        status: 'pending',
      },
    });

    return NextResponse.json({ ok: true, id: request.id }, { status: 201 });
  } catch (e) {
    console.error('[data-request] error:', e);
    return NextResponse.json(
      { error: 'failed_to_submit' },
      { status: 500 },
    );
  }
}
