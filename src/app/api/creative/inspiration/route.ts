import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creative/inspiration
 * Returns a curated feed of high-performing creatives.
 *
 * Sources:
 * 1. User's own top-performing creatives (from CreativePerformance joined with Creation/Asset)
 * 2. Built-in example creatives (curated list)
 *
 * Query params:
 *   - platform: filter by platform (tiktok, instagram, youtube, facebook)
 *   - format: filter by ad format (ugc, commercial, drama, skit)
 *   - industry: filter by industry/category
 *   - limit: max results (default 20, max 50)
 */

// Built-in example creatives for inspiration
const BUILTIN_INSPIRATION = [
  {
    id: 'builtin-1',
    title: 'Stop Scrolling Hook',
    platform: 'tiktok',
    format: 'ugc',
    industry: 'beauty',
    hook: 'POV: You just found the skincare hack everyone is talking about',
    angle: 'Social proof + curiosity gap',
    cta: 'Shop now before it sells out',
    avgRoas: 4.2,
    avgCtr: 3.8,
    impressions: 1250000,
    source: 'curated',
  },
  {
    id: 'builtin-2',
    title: 'Problem-Solution Demo',
    platform: 'instagram',
    format: 'ugc',
    industry: 'tech',
    hook: 'I was tired of my earbuds dying mid-workout. Then I found these.',
    angle: 'Pain point resolution + personal testimonial',
    cta: 'Get 20% off your first pair',
    avgRoas: 3.5,
    avgCtr: 2.9,
    impressions: 890000,
    source: 'curated',
  },
  {
    id: 'builtin-3',
    title: 'Before/After Transformation',
    platform: 'tiktok',
    format: 'ugc',
    industry: 'fitness',
    hook: 'Nobody talks about this 30-second morning routine that changed everything',
    angle: 'Transformation + mystery',
    cta: 'Start your free trial',
    avgRoas: 5.1,
    avgCtr: 4.2,
    impressions: 2100000,
    source: 'curated',
  },
  {
    id: 'builtin-4',
    title: 'Unboxing + First Impressions',
    platform: 'youtube',
    format: 'commercial',
    industry: 'tech',
    hook: 'I finally got my hands on the most anticipated gadget of 2026',
    angle: 'Exclusivity + anticipation',
    cta: 'Pre-order today',
    avgRoas: 3.8,
    avgCtr: 2.5,
    impressions: 750000,
    source: 'curated',
  },
  {
    id: 'builtin-5',
    title: 'Emotional Storytelling',
    platform: 'facebook',
    format: 'drama',
    industry: 'food',
    hook: 'My grandmother taught me this recipe before she passed. Now it feeds thousands.',
    angle: 'Emotional connection + heritage',
    cta: 'Order family meals starting at $12',
    avgRoas: 4.5,
    avgCtr: 3.1,
    impressions: 1500000,
    source: 'curated',
  },
  {
    id: 'builtin-6',
    title: 'Number-Based Hook',
    platform: 'tiktok',
    format: 'ugc',
    industry: 'finance',
    hook: '3 money mistakes that are keeping you broke (and how to fix them today)',
    angle: 'Listicle + actionable advice',
    cta: 'Download the free guide',
    avgRoas: 4.8,
    avgCtr: 4.5,
    impressions: 3200000,
    source: 'curated',
  },
  {
    id: 'builtin-7',
    title: 'Contrast Hook',
    platform: 'instagram',
    format: 'ugc',
    industry: 'fashion',
    hook: 'Cheap vs $200 — can you tell the difference?',
    angle: 'Value comparison + challenge',
    cta: 'Shop the affordable alternative',
    avgRoas: 3.9,
    avgCtr: 3.3,
    impressions: 980000,
    source: 'curated',
  },
  {
    id: 'builtin-8',
    title: 'Authority Endorsement',
    platform: 'youtube',
    format: 'commercial',
    industry: 'health',
    hook: 'Why dermatologists are switching to this one ingredient',
    angle: 'Expert authority + trend',
    cta: 'Learn more from experts',
    avgRoas: 3.2,
    avgCtr: 2.1,
    impressions: 650000,
    source: 'curated',
  },
  {
    id: 'builtin-9',
    title: 'Controversial Take',
    platform: 'tiktok',
    format: 'skit',
    industry: 'beauty',
    hook: 'Unpopular opinion: your skincare routine is doing more harm than good',
    angle: 'Controversy + education',
    cta: 'Take the free skin quiz',
    avgRoas: 5.5,
    avgCtr: 5.2,
    impressions: 2800000,
    source: 'curated',
  },
  {
    id: 'builtin-10',
    title: 'Urgency + Scarcity',
    platform: 'facebook',
    format: 'commercial',
    industry: 'retail',
    hook: 'Last 48 hours: The sale everyone has been waiting for',
    angle: 'Urgency + social proof',
    cta: 'Shop the sale now',
    avgRoas: 4.1,
    avgCtr: 3.6,
    impressions: 1100000,
    source: 'curated',
  },
  {
    id: 'builtin-11',
    title: 'Identity-Based Hook',
    platform: 'tiktok',
    format: 'ugc',
    industry: 'fitness',
    hook: 'If you are a busy mom who wants to stay fit, this is for you',
    angle: 'Identity targeting + belonging',
    cta: 'Join the challenge',
    avgRoas: 4.3,
    avgCtr: 3.7,
    impressions: 1300000,
    source: 'curated',
  },
  {
    id: 'builtin-12',
    title: 'Bizarre/Surprise',
    platform: 'instagram',
    format: 'ugc',
    industry: 'home',
    hook: 'I did not believe this would work until I tried it myself',
    angle: 'Skepticism to conversion + surprise',
    cta: 'Try it risk-free for 30 days',
    avgRoas: 3.6,
    avgCtr: 2.8,
    impressions: 820000,
    source: 'curated',
  },
];

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const platform = url.searchParams.get('platform') || '';
  const format = url.searchParams.get('format') || '';
  const industry = url.searchParams.get('industry') || '';
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20') || 20, 1), 50);

  // Get user's top-performing creatives from performance data
  const performanceRecords = await prisma.creativePerformance.findMany({
    where: { userId: uid, ...(platform ? { platform } : {}) },
    orderBy: { roas: 'desc' },
    take: 30,
  });

  // Group by creationId and aggregate
  const byCreation: Record<string, { roas: number[]; ctr: number[]; impressions: number[]; platform: string; hookType: string; angleName: string }> = {};
  for (const r of performanceRecords) {
    const key = r.creationId || 'unknown';
    if (!byCreation[key]) byCreation[key] = { roas: [], ctr: [], impressions: [], platform: r.platform, hookType: r.hookType || '', angleName: r.angleName || '' };
    byCreation[key].roas.push(r.roas);
    byCreation[key].ctr.push(r.ctr);
    byCreation[key].impressions.push(r.impressions);
  }

  const userCreatives = Object.entries(byCreation)
    .map(([creationId, data]) => ({
      id: `user-${creationId}`,
      title: `My Creative (${creationId.slice(0, 8)})`,
      platform: data.platform,
      format: '',
      industry: '',
      hook: data.hookType,
      angle: data.angleName,
      cta: '',
      avgRoas: data.roas.reduce((a, b) => a + b, 0) / data.roas.length,
      avgCtr: data.ctr.reduce((a, b) => a + b, 0) / data.ctr.length,
      impressions: data.impressions.reduce((a, b) => a + b, 0),
      source: 'user',
      creationId,
    }))
    .filter(c => c.avgRoas > 0)
    .sort((a, b) => b.avgRoas - a.avgRoas)
    .slice(0, 10);

  // Filter built-in creatives
  let builtins = BUILTIN_INSPIRATION.filter(c => {
    if (platform && c.platform !== platform) return false;
    if (format && c.format !== format) return false;
    if (industry && c.industry !== industry) return false;
    return true;
  });

  // Combine and sort by ROAS
  const combined = [...userCreatives, ...builtins]
    .sort((a, b) => b.avgRoas - a.avgRoas)
    .slice(0, limit);

  // Get unique industries for filter options
  const industries = [...new Set(BUILTIN_INSPIRATION.map(c => c.industry))].sort();
  const platforms = ['tiktok', 'instagram', 'youtube', 'facebook'];
  const formats = ['ugc', 'commercial', 'drama', 'skit'];

  return NextResponse.json({
    creatives: combined,
    filters: { platforms, formats, industries },
    stats: {
      total: combined.length,
      userCreatives: userCreatives.length,
      curated: builtins.length,
    },
  });
}
