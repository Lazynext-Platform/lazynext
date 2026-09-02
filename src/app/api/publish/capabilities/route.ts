import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getAllPlatforms } from '@/lib/publishing/platforms';

export const maxDuration = 60;

async function __byokGET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const platforms = getAllPlatforms();
  return NextResponse.json({ platforms });
}

export const GET = withAtlas(__byokGET);
