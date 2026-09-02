import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

const VALID_EVENTS = [
  'creative.generated', 'creative.scored', 'campaign.deployed',
  'campaign.metrics_updated', 'pipeline.completed', 'performance.recorded',
];

/** GET /api/webhooks — list user's webhook endpoints */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ endpoints: endpoints.map(e => ({
    id: e.id,
    url: e.url,
    events: e.events.split(','),
    active: e.active,
    lastFiredAt: e.lastFiredAt?.toISOString() || null,
    lastStatus: e.lastStatus,
    createdAt: e.createdAt.toISOString(),
  }))});
}

/** POST /api/webhooks — create a new webhook endpoint */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const url = String(body.url || '').trim();
  const events = Array.isArray(body.events) ? body.events : [];

  if (!url) return NextResponse.json({ error: 'url_required' }, { status: 400 });
  if (!url.startsWith('http://') && !url.startsWith('https://'))
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
  if (events.length === 0) return NextResponse.json({ error: 'events_required' }, { status: 400 });

  const invalidEvents = events.filter((e: string) => !VALID_EVENTS.includes(e));
  if (invalidEvents.length > 0) return NextResponse.json({ error: 'invalid_events', invalid: invalidEvents }, { status: 400 });

  const secret = randomBytes(32).toString('hex');
  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      userId: session.user.id,
      url,
      secret,
      events: events.join(','),
      active: true,
    },
  });

  return NextResponse.json({
    id: endpoint.id,
    url: endpoint.url,
    events: endpoint.events.split(','),
    secret, // returned once at creation time
    active: endpoint.active,
  });
}

/** DELETE /api/webhooks?id=xxx — delete a webhook endpoint */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id, userId: session.user.id } });
  if (!endpoint) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await prisma.webhookEndpoint.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

/** PATCH /api/webhooks?id=xxx — toggle active state or update events */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id, userId: session.user.id } });
  if (!endpoint) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.active === 'boolean') data.active = body.active;
  if (Array.isArray(body.events)) {
    const invalidEvents = body.events.filter((e: string) => !VALID_EVENTS.includes(e));
    if (invalidEvents.length > 0) return NextResponse.json({ error: 'invalid_events', invalid: invalidEvents }, { status: 400 });
    data.events = body.events.join(',');
  }

  await prisma.webhookEndpoint.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
