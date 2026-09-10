import { NextRequest, NextResponse } from 'next/server';
import { QualityManagementService } from '@/lib/services/quality-management-service';
import type { StandardType } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/standards/[id] — get a quality standard by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const standard = await QualityManagementService.getStandard(id);
  if (!standard) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ standard });
}

/** PATCH /api/quality-management/standards/[id] — update a quality standard */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const standard = await QualityManagementService.updateStandard(id, {
      name: body.name,
      standard: body.standard as StandardType | undefined,
      description: body.description,
      requirements: body.requirements,
      version: body.version,
      isActive: body.isActive,
    });
    if (!standard) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ standard });
  } catch (e) {
    console.error('[quality-management] update standard error:', e);
    return NextResponse.json({ error: 'failed_to_update_standard' }, { status: 500 });
  }
}

/** DELETE /api/quality-management/standards/[id] — delete a quality standard */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const deleted = await QualityManagementService.deleteStandard(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
