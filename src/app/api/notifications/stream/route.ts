import { NextRequest } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/notifications/stream — Server-Sent Events stream for real-time
 * notifications. The client connects with EventSource and receives
 * 'notification' events as they are created.
 *
 * Uses a polling fallback inside SSE (every 10s) since Cloudflare Workers
 * don't support long-lived WebSocket connections in the same way, and
 * D1 doesn't support LISTEN/NOTIFY. This is a pragmatic SSE implementation
 * that works within Cloudflare's constraints.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

  const encoder = new TextEncoder();
  let lastCheck = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection confirmation
      controller.enqueue(encoder.encode(': connected\n\n'));

      // Poll for new notifications every 10 seconds
      const interval = setInterval(async () => {
        const delays = [200, 500];
        for (let attempt = 0; attempt <= delays.length; attempt++) {
          try {
            const newNotifications = await prisma.notification.findMany({
              where: {
                userId,
                createdAt: { gt: lastCheck },
              },
              orderBy: { createdAt: 'desc' },
              take: 10,
            });

            lastCheck = new Date();

            for (const n of newNotifications) {
              const data = JSON.stringify({
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                createdAt: n.createdAt.toISOString(),
              });
              controller.enqueue(encoder.encode(`event: notification\ndata: ${data}\n\n`));
            }

            // Send heartbeat to keep connection alive
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
            break; // Success — exit retry loop
          } catch (err) {
            // Don't close the stream on error — retry with backoff, then skip this tick
            if (attempt < delays.length) {
              await new Promise((r) => setTimeout(r, delays[attempt]));
              continue;
            }
            // Next tick will try again
          }
        }
      }, 10_000);

      // Clean up on abort
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
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
