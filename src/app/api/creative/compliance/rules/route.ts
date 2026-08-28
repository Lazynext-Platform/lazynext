import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  getComplianceRules,
  getCompliancePlatforms,
  type CompliancePlatform,
} from '@/lib/creative/compliance';

const VALID_PLATFORMS = new Set<CompliancePlatform>(['tiktok', 'youtube', 'meta', 'google', 'universal']);

async function __byokGET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const platformParam = url.searchParams.get('platform');
  const platform = platformParam && VALID_PLATFORMS.has(platformParam as CompliancePlatform)
    ? (platformParam as CompliancePlatform)
    : undefined;

  const rules = getComplianceRules(platform);
  const platforms = getCompliancePlatforms();

  return NextResponse.json({ rules, platforms });
}

export const GET = withAtlas(__byokGET);
