import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorComplianceService } from '@/lib/services/vendor-compliance-service';

/** GET /api/vendors/compliance/non-compliant — vendors with non-compliant or expired records */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ records: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const records = await VendorComplianceService.getNonCompliant(organizationId);

  return NextResponse.json({ records });
}
