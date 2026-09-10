import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getRoleDefinition } from '@/lib/services/agent-roles';
import { safeError } from '@/lib/security';

/**
 * GET /api/agent-roles/[role]
 * Get a specific agent role definition by role name.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { role: string } },
) {
  const { role } = params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const definition = getRoleDefinition(role);
    if (!definition) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ role: definition });
  } catch (e) {
    return NextResponse.json(
      safeError(e, 'agent-roles/[role]', 'get_failed'),
      { status: 500 },
    );
  }
}
