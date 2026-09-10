import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CompanyService } from '@/lib/services/company';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/**
 * GET /api/companies — list companies (organizations) for the current user.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  try {
    const companies = await CompanyService.listForUser(session.user.id);
    return NextResponse.json({ companies });
  } catch (e) {
    console.error('[companies] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_companies' }, { status: 500 });
  }
}

/**
 * POST /api/companies — create a new company (organization).
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  let body: {
    name?: string;
    description?: string;
    mission?: string;
    vision?: string;
    industry?: string;
    website?: string;
    targetMarket?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }
  if (name.length > 200) {
    return NextResponse.json({ error: 'name_too_long' }, { status: 400 });
  }

  try {
    const result = await CompanyService.create(session.user.id, {
      name,
      description: body.description?.trim() || undefined,
      mission: body.mission?.trim() || undefined,
      vision: body.vision?.trim() || undefined,
      industry: body.industry?.trim() || undefined,
      website: body.website?.trim() || undefined,
      targetMarket: body.targetMarket?.trim() || undefined,
    });
    return NextResponse.json({ companyId: result.companyId, workspaceId: result.workspaceId }, { status: 201 });
  } catch (e) {
    console.error('[companies] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_company' }, { status: 500 });
  }
}
