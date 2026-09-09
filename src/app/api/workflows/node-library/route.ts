import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkflowNodeLibrary } from '@/lib/services/workflow-node-library';

/** GET /api/workflows/node-library — get the full node library (types, schemas, operators) */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    triggerTypes: WorkflowNodeLibrary.getTriggerTypes(),
    actionTypes: WorkflowNodeLibrary.getActionTypes(),
    integrationTypes: WorkflowNodeLibrary.getIntegrationTypes(),
    conditionOperators: WorkflowNodeLibrary.getConditionOperators(),
    nodeTypes: WorkflowNodeLibrary.getAllNodeTypes(),
  });
}
