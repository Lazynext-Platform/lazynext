import { NextRequest, NextResponse } from 'next/server';
import { QualityManagementService } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/root-cause/[id] — get a root cause analysis by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const analysis = await QualityManagementService.getRootCauseAnalysis(id);
  if (!analysis) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ analysis });
}
