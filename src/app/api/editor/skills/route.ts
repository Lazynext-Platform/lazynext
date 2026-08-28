import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { listSkills, getSkill, recommendSkills, type ContentType } from '@/lib/editor/skills';

/**
 * GET /api/editor/skills
 * Query params: ?contentType=talking-head&platform=tiktok&tag=captions
 * Or: ?recommend=true&contentType=talking-head&platform=tiktok
 * Or: ?id=fast-paced-hook-cut
 * Returns the list of editing skills (built-in and user-created).
 * No credit cost — this is metadata only.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const contentType = url.searchParams.get('contentType') as ContentType | null;
  const platform = url.searchParams.get('platform');
  const tag = url.searchParams.get('tag');
  const recommend = url.searchParams.get('recommend') === 'true';

  // Get a single skill by ID
  if (id) {
    const skill = getSkill(id);
    if (!skill) return NextResponse.json({ error: 'skill_not_found' }, { status: 404 });
    return NextResponse.json({ skill });
  }

  // Recommend skills for content type + platform
  if (recommend && contentType) {
    const skills = recommendSkills(contentType, platform || undefined);
    return NextResponse.json({ skills, count: skills.length });
  }

  // List with optional filters
  const skills = listSkills({
    contentType: contentType || undefined,
    platform: platform || undefined,
    tag: tag || undefined,
  });

  return NextResponse.json({ skills, count: skills.length });
}
