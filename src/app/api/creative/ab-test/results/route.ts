import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/creative/ab-test/results?campaignName=xxx
 * Returns A/B test results by grouping campaigns with the same base name.
 * Each variant campaign has " — Variant A", " — Variant B", etc. in its name.
 *
 * Also supports: GET /api/creative/ab-test/results (returns all A/B test groups)
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const campaignName = url.searchParams.get('campaignName');

  // Fetch all campaigns for the user
  const campaigns = await prisma.adCampaign.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
  });

  // Group campaigns by base name (strip " — Variant X" suffix)
  const groups: Record<string, typeof campaigns> = {};
  for (const c of campaigns) {
    const baseName = c.name.replace(/\s+—\s+Variant\s+[A-E]$/i, '');
    if (!groups[baseName]) groups[baseName] = [];
    groups[baseName].push(c);
  }

  // Only keep groups with 2+ variants (actual A/B tests)
  const abTestGroups = Object.entries(groups)
    .filter(([_, camps]) => camps.length >= 2)
    .map(([name, camps]) => {
      // Sort variants A, B, C...
      camps.sort((a, b) => {
        const aMatch = a.name.match(/Variant\s+([A-E])$/i);
        const bMatch = b.name.match(/Variant\s+([A-E])$/i);
        if (aMatch && bMatch) return aMatch[1].localeCompare(bMatch[1]);
        return 0;
      });
      return { name, campaigns: camps };
    });

  // If campaignName specified, filter to just that group
  const filtered = campaignName ? abTestGroups.filter(g => g.name === campaignName) : abTestGroups;

  // Fetch performance data for each variant
  const results = await Promise.all(filtered.map(async (group) => {
    const variants = await Promise.all(group.campaigns.map(async (c) => {
      const perfRecords = await prisma.creativePerformance.findMany({
        where: { userId: uid, campaignId: c.id },
        orderBy: { recordedAt: 'desc' },
      });

      const totalImpressions = perfRecords.reduce((sum, r) => sum + r.impressions, 0);
      const totalClicks = perfRecords.reduce((sum, r) => sum + r.clicks, 0);
      const totalConversions = perfRecords.reduce((sum, r) => sum + r.conversions, 0);
      const totalSpend = perfRecords.reduce((sum, r) => sum + r.spend, 0);
      const totalRevenue = perfRecords.reduce((sum, r) => sum + r.revenue, 0);
      const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const cvr = totalClicks > 0 ? totalConversions / totalClicks : 0;
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

      const variantMatch = c.name.match(/Variant\s+([A-E])$/i);
      const variantLabel = variantMatch ? variantMatch[1] : '?';

      return {
        campaignId: c.id,
        variantLabel,
        name: c.name,
        platform: c.platform,
        status: c.status,
        budgetDaily: c.budgetDaily,
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        spend: totalSpend,
        revenue: totalRevenue,
        ctr,
        cvr,
        roas,
        sampleSize: perfRecords.length,
      };
    }));

    // Determine winner (highest ROAS with sufficient data)
    const withData = variants.filter(v => v.sampleSize > 0);
    const winner = withData.length > 0
      ? withData.reduce((best, v) => v.roas > best.roas ? v : best)
      : null;

    // Simple statistical significance: check if sample sizes are adequate
    // (This is a simplified heuristic — not a formal statistical test)
    const totalSamples = withData.reduce((sum, v) => sum + v.sampleSize, 0);
    const minSamplesForSignificance = 30;
    const isSignificant = totalSamples >= minSamplesForSignificance;
    const confidenceLevel = Math.min(95, Math.round((totalSamples / minSamplesForSignificance) * 100));

    return {
      name: group.name,
      variants,
      winner: winner ? { variantLabel: winner.variantLabel, roas: winner.roas, name: winner.name } : null,
      isSignificant,
      confidenceLevel,
      totalSamples,
    };
  }));

  return NextResponse.json({ groups: results });
}
