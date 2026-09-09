import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InitiativeService } from '@/lib/services/initiative';

/**
 * GET /api/initiatives/[id] — get an initiative by ID.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const initiative = await InitiativeService.get(id);
    if (!initiative) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ initiative });
  } catch (e) {
    console.error('[initiatives] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_initiative' }, { status: 500 });
  }
}

/**
 * PATCH /api/initiatives/[id] — update an initiative.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    name?: string;
    description?: string;
    status?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    currency?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.name !== undefined) {
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: 'name_required' }, { status: 400 });
    }
    body.name = name;
  }

  try {
    const existing = await InitiativeService.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    let startDate: Date | null | undefined;
    if (body.startDate !== undefined) {
      if (body.startDate) {
        const parsed = new Date(body.startDate);
        startDate = isNaN(parsed.getTime()) ? null : parsed;
      } else {
        startDate = null;
      }
    }
    let endDate: Date | null | undefined;
    if (body.endDate !== undefined) {
      if (body.endDate) {
        const parsed = new Date(body.endDate);
        endDate = isNaN(parsed.getTime()) ? null : parsed;
      } else {
        endDate = null;
      }
    }

    const updated = await InitiativeService.update(id, {
      name: body.name,
      description: body.description?.trim(),
      status: body.status?.trim(),
      priority: body.priority?.trim(),
      startDate,
      endDate,
      budget: body.budget,
      currency: body.currency?.trim(),
    });
    return NextResponse.json({ initiative: updated });
  } catch (e) {
    console.error('[initiatives] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_initiative' }, { status: 500 });
  }
}
