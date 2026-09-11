import { NextRequest } from 'next/server';
import { auth } from '@/../auth';
import { ActivityFeedService } from '@/lib/services/activity-feed';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/activity-feed
 * Server-Sent Events (SSE) stream of live activity for an organization.
 *
 * Query params:
 *  - organizationId: the organization to stream events for
 *  - type: optional event type filter (prefix match)
 *
 * The client must be authenticated. The stream sends:
 *  1. A "connected" event on connection
 *  2. Recent events (last 50)
 *  3. New events as they are created (polled every 2 seconds)
 *  4. Keepalive comments every 15 seconds
 *
 * Note: Cloudflare Workers have a 30s subrequest limit, so this route
 * polls the database every 2 seconds for new events rather than
 * using a persistent connection.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get('organizationId');
  const typeFilter = searchParams.get('type') || undefined;

  if (!organizationId) {
    return new Response('Missing organizationId', { status: 400 });
  }

  // Verify the user has access to this organization
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { workspace: { select: { organizationId: true } } },
  });

  if (!membership || membership.workspace.organizationId !== organizationId) {
    return new Response('Forbidden', { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // 1. Send connected event
      controller.enqueue(encoder.encode(ActivityFeedService.formatConnected()));

      // 2. Send recent events
      const recent = await ActivityFeedService.getRecent({
        organizationId,
        limit: 50,
        typeFilter,
      });

      for (const event of recent.events) {
        controller.enqueue(encoder.encode(ActivityFeedService.formatSSE(event)));
      }

      // 3. Poll for new events
      let lastEventId = recent.events[0]?.id;
      let lastKeepalive = Date.now();
      let closed = false;

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        closed = true;
      });

      while (!closed) {
        try {
          // Check for new events
          const newEvents = await prisma.event.findMany({
            where: {
              organizationId,
              ...(typeFilter && { type: { startsWith: typeFilter } }),
              ...(lastEventId && { id: { gt: lastEventId } }),
            },
            orderBy: { createdAt: 'asc' },
            take: 100,
          }).catch(() => []);

          for (const e of newEvents) {
            const event: ActivityEvent = {
              id: e.id,
              type: e.type,
              actor: e.actor || '',
              actorType: e.actorType || 'system',
              resourceType: e.resourceType || undefined,
              resourceId: e.resourceId || undefined,
              metadata: (e.metadata as unknown as Record<string, unknown>) || {},
              timestamp: e.createdAt.toISOString(),
            };
            controller.enqueue(encoder.encode(ActivityFeedService.formatSSE(event)));
            lastEventId = e.id;
          }

          // Send keepalive every 15 seconds
          if (Date.now() - lastKeepalive > 15000) {
            controller.enqueue(encoder.encode(ActivityFeedService.formatKeepalive()));
            lastKeepalive = Date.now();
          }

          // Wait 2 seconds before next poll
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch {
          // On error, wait and retry
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ── Types ──

interface ActivityEvent {
  id: string;
  type: string;
  actor: string;
  actorType: string;
  resourceType?: string;
  resourceId?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}
