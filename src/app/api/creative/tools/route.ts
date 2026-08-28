import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { listTools } from '@/lib/creative/tools';

async function __byokGET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const tools = listTools().map((t) => ({
    name: t.name,
    description: t.description,
    cost: t.cost,
    capabilities: t.capabilities,
    inputSchema: t.inputSchema,
    outputSchema: t.outputSchema,
  }));

  return NextResponse.json({ tools });
}

export const GET = withAtlas(__byokGET);
