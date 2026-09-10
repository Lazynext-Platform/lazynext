import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AgentRoleDefinitions } from '@/lib/services/agent-roles';
import { safeError } from '@/lib/security';

/**
 * GET /api/agent-roles
 * List all agent role definitions.
 */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const roles = Object.values(AgentRoleDefinitions);
    return NextResponse.json({ roles });
  } catch (e) {
    return NextResponse.json(safeError(e, 'agent-roles', 'list_failed'), { status: 500 });
  }
}
