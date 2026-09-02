import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * GET /api/creative/comments/stream?assetId=xxx
 * Server-Sent Events stream for real-time comment updates.
 * Polls the database every 3 seconds and sends updates.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const assetId = url.searchParams.get('assetId');
  if (!assetId) return new Response('assetId required', { status: 400 });

  // Verify ownership
  const asset = await prisma.asset.findFirst({ where: { id: assetId, userId: uid } });
  if (!asset) return new Response('Not found', { status: 404 });

  const encoder = new TextEncoder();
  let lastCount = 0;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial heartbeat
      send({ type: 'connected', assetId });

      // Poll for changes every 3 seconds
      const interval = setInterval(async () => {
        if (closed) return;
        try {
          const count = await prisma.creativeComment.count({ where: { assetId } });
          if (count !== lastCount) {
            lastCount = count;
            const comments = await prisma.creativeComment.findMany({
              where: { assetId },
              orderBy: { createdAt: 'asc' },
            });
            send({ type: 'update', count, comments: comments.map(c => ({
              id: c.id, userId: c.userId, assetId: c.assetId, parentId: c.parentId,
              body: c.body, resolved: c.resolved, createdAt: c.createdAt.toISOString(),
            }))});
          }
        } catch {
          // Ignore polling errors
        }
      }, 3000);

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        closed = true;
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
    },
  });
}
