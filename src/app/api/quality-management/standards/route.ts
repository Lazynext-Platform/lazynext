import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { QualityManagementService } from '@/lib/services/quality-management-service';
import type { StandardType } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/standards — list quality standards */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const standards = await QualityManagementService.listStandards(organizationId, {
    standard: (sp.get('standard') as StandardType) || undefined,
    isActive: sp.get('isActive') === 'true' ? true : sp.get('isActive') === 'false' ? false : undefined,
  });

  return NextResponse.json({ standards });
}

/** POST /api/quality-management/standards — create a quality standard */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  try {
    const standard = await QualityManagementService.createStandard(
      organizationId,
      body.workspaceId || organizationId,
      {
        name,
        standard: body.standard as StandardType | undefined,
        description: body.description,
        requirements: body.requirements,
        version: body.version,
        isActive: body.isActive,
      },
      userId,
    );
    return NextResponse.json({ standard }, { status: 201 });
  } catch (e) {
    console.error('[quality-management] create standard error:', e);
    return NextResponse.json({ error: 'failed_to_create_standard' }, { status: 500 });
  }
}
