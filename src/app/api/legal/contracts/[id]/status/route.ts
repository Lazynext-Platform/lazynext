import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LegalContractService } from '@/lib/services/legal-contract-service';

/** POST /api/legal/contracts/[id]/status — change contract status */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }

  try {
    const contract = await LegalContractService.changeStatus(id, body.status);
    if (!contract) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ contract });
  } catch (e) {
    console.error('[legal/contracts] status error:', e);
    return NextResponse.json({ error: 'failed_to_change_status' }, { status: 500 });
  }
}
