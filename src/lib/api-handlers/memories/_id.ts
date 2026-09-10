import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MemoryService } from '@/lib/services/memory';

/**
 * GET /api/memories/[id] — get a memory by ID.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const memory = await MemoryService.get(id);
    if (!memory) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ memory });
  } catch (e) {
    console.error('[memories] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_memory' }, { status: 500 });
  }
}

/**
 * PATCH /api/memories/[id] — update a memory.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: {
    content?: string;
    confidence?: number;
    lifecycle?: 'permanent' | 'long' | 'medium' | 'short';
    tags?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    // Verify the memory exists
    const existing = await MemoryService.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const updated = await MemoryService.update(id, {
      content: body.content?.trim(),
      confidence: body.confidence,
      lifecycle: body.lifecycle,
      tags: body.tags,
    });
    return NextResponse.json({ memory: updated });
  } catch (e) {
    console.error('[memories] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_memory' }, { status: 500 });
  }
}

/**
 * DELETE /api/memories/[id] — delete a memory.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    // Verify the memory exists
    const existing = await MemoryService.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    await MemoryService.delete(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[memories] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_memory' }, { status: 500 });
  }
}
