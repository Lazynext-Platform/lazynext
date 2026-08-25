import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pollOnce } from '@/lib/atlas';
import { grantCredits } from '@/lib/credits';
import { pollMarketingTask } from '@/lib/lazynext-studio/poll-task';

// When frontend generation is interrupted/fails, marks own still-processing placeholder creation as failed (creations page shows "failed" instead of spinning forever).
async function __byokPOST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.status !== 'failed') return NextResponse.json({ error: 'bad_status' }, { status: 400 });
  await prisma.creation.updateMany({
    where: { id: params.id, userId: session.user.id, status: 'processing' },
    data: { status: 'failed', error: (typeof body.error === 'string' ? body.error : 'canceled').slice(0, 500) },
  });
  return NextResponse.json({ ok: true });
}

// Polled by the client. Each call advances the task status at most once.
async function __byokGET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const c = await prisma.creation.findUnique({ where: { id: params.id } });
  if (!c || c.userId !== session.user.id)
    return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Marketing Studio's final video task is directly attached to the creation placeholder by the server. The creations page can also independently query, transfer and
  // write back the final video, no longer depending on the generation page staying open to execute the last save-reel.
  if (
    c.templateId === 'lazynext-studio'
    && c.getUrl
    && (c.status === 'processing' || c.status === 'persisting')
  ) {
    try {
      const task = await pollMarketingTask(c.getUrl);
      if (task.status === 'completed' && task.outputs.length && task.persisted !== false) {
        const update = await prisma.creation.update({
          where: { id: c.id },
          data: {
            status: 'completed',
            outputs: task.outputs,
            error: null,
          },
        });
        return NextResponse.json({
          id: update.id,
          status: update.status,
          outputs: update.outputs,
        });
      }
      if (task.status === 'failed') {
        const update = await prisma.creation.updateMany({
          where: { id: c.id, status: { in: ['processing', 'persisting'] } },
          data: { status: 'failed', error: task.error || 'generation failed' },
        });
        return NextResponse.json({
          id: c.id,
          status: update.count === 1 ? 'failed' : c.status,
          error: task.error,
        });
      }
      return NextResponse.json({ id: c.id, status: 'processing' });
    } catch (error) {
      console.warn(`[creations/${c.id}] marketing task reconcile failed:`, String(error));
      return NextResponse.json({ id: c.id, status: 'processing' });
    }
  }

  // Terminal states: nothing more to do. (includes assets, drama detail page needs it)
  if (c.status === 'completed' || c.status === 'failed')
    return NextResponse.json({ id: c.id, status: c.status, outputs: c.outputs, error: c.error, assets: c.assets, prompt: c.prompt, templateId: c.templateId, inputImage: c.inputImage, createdAt: c.createdAt });
  // Placeholder record (no getUrl): frontend updates it on completion/failure; if already stuck in processing beyond timeout, treat as frontend interruption,
  // auto-mark as failed, to avoid creations page spinning forever. Placeholder has no charge, no refund needed.
  if (!c.getUrl) {
    // Drama creation folder is step-by-step manual generation, may take a long time, exempt from 15-minute timeout (otherwise folder gets mistakenly marked failed before generation completes).
    const isDramaFolder = !!c.assets && typeof c.assets === 'object' && (c.assets as { kind?: string }).kind === 'drama';
    // Marketing Studio's first frame and video are serial tasks, give enough 90 minutes consistent with frontend total polling;
    // old 15 minutes would mistakenly mark creation failed while Atlas is still generating normally.
    const placeholderTimeoutMs = c.templateId === 'lazynext-studio' ? 90 * 60_000 : 15 * 60_000;
    if (!isDramaFolder && Date.now() - new Date(c.createdAt).getTime() > placeholderTimeoutMs) {
      await prisma.creation.updateMany({ where: { id: c.id, status: 'processing' }, data: { status: 'failed', error: 'timeout' } });
      return NextResponse.json({ id: c.id, status: 'failed', error: 'timeout' });
    }
    return NextResponse.json({ id: c.id, status: c.status, outputs: c.outputs, error: c.error, assets: c.assets, prompt: c.prompt, templateId: c.templateId, inputImage: c.inputImage, createdAt: c.createdAt });
  }

  try {
    const p = await pollOnce(c.getUrl);
    if (p.status === 'completed') {
      const u = await prisma.creation.update({
        where: { id: c.id },
        data: { status: 'completed', outputs: p.outputs },
      });
      return NextResponse.json({ id: u.id, status: u.status, outputs: u.outputs });
    }
    if (p.status === 'failed') {
      const update = await prisma.creation.updateMany({
        where: { id: c.id, status: 'processing' },
        data: { status: 'failed', error: p.error || 'generation failed' },
      });
      if (update.count === 1 && c.cost > 0) {
        await grantCredits(c.userId, c.cost, 'refund', c.id); // refund a failed job
      }
      return NextResponse.json({ id: c.id, status: 'failed', error: p.error });
    }
    return NextResponse.json({ id: c.id, status: 'processing' });
  } catch {
    // Transient poll error — keep the client polling.
    return NextResponse.json({ id: c.id, status: 'processing' });
  }
}

// Delete a creation (owner only). Removes the D1 record. R2 media is not deleted
// (orphaned media keys are harmless and cheaper than tracking references).
async function __byokDELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const result = await prisma.creation.deleteMany({
    where: { id: params.id, userId: session.user.id },
  });
  if (result.count === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export const POST = withAtlas(__byokPOST);
export const GET = withAtlas(__byokGET);
export const DELETE = withAtlas(__byokDELETE);
