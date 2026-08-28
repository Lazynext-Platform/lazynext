import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { listSkills, listChains } from '@/lib/creative/skill-library';

export const maxDuration = 60;

async function __byokGET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  return NextResponse.json({ skills: listSkills(), chains: listChains() });
}

export const GET = withAtlas(__byokGET);
