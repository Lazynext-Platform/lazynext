import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CompanyService } from '@/lib/services/company';

/**
 * GET /api/companies/[id] — get a company by ID.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const company = await CompanyService.get(id);
    if (!company) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    // Only the owner (or members) can view; enforce owner check for safety
    if (company.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ company });
  } catch (e) {
    console.error('[companies] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_company' }, { status: 500 });
  }
}

/**
 * PATCH /api/companies/[id] — update company fields (owner only).
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
    mission?: string;
    vision?: string;
    strategy?: string;
    industry?: string;
    website?: string;
    targetMarket?: string;
    logoUrl?: string;
    autonomyMode?: 'manual' | 'assisted' | 'autonomous' | 'timed';
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
    if (name.length > 200) {
      return NextResponse.json({ error: 'name_too_long' }, { status: 400 });
    }
    body.name = name;
  }

  try {
    const updated = await CompanyService.update(id, session.user.id, {
      name: body.name,
      description: body.description?.trim(),
      mission: body.mission?.trim(),
      vision: body.vision?.trim(),
      strategy: body.strategy?.trim(),
      industry: body.industry?.trim(),
      website: body.website?.trim(),
      targetMarket: body.targetMarket?.trim(),
      logoUrl: body.logoUrl?.trim(),
      autonomyMode: body.autonomyMode,
    });
    if (!updated) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ company: updated });
  } catch (e) {
    console.error('[companies] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_company' }, { status: 500 });
  }
}
