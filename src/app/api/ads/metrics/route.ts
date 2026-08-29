import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { metaAds } from '@/lib/ad-platforms/meta';
import { googleAds } from '@/lib/ad-platforms/google';
import { dispatchWebhook } from '@/lib/webhooks';

export const maxDuration = 60;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : '';
  if (!campaignId) return NextResponse.json({ error: 'campaignId_required' }, { status: 400 });

  // Look up campaign in DB
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, userId: uid },
  }).catch(() => null);

  if (!campaign) return NextResponse.json({ error: 'campaign_not_found' }, { status: 404 });

  const provider = campaign.platform === 'meta' ? metaAds : googleAds;

  try {
    const metrics = campaign.campaignId
      ? await provider.getMetrics(campaign.campaignId)
      : (campaign.metrics as { impressions: number; clicks: number; conversions: number; spend: number; revenue: number; ctr: number; cvr: number; roas: number } | null);

    // Persist metrics to CreativePerformance for learning loop
    if (metrics && campaign.creativeIds) {
      const creativeIds = Array.isArray(campaign.creativeIds) ? campaign.creativeIds : [];
      for (const creationId of creativeIds) {
        await prisma.creativePerformance.create({
          data: {
            userId: uid,
            creationId: typeof creationId === 'string' ? creationId : String(creationId),
            campaignId: campaign.id,
            platform: campaign.platform,
            impressions: metrics.impressions || 0,
            clicks: metrics.clicks || 0,
            conversions: metrics.conversions || 0,
            spend: metrics.spend || 0,
            revenue: metrics.revenue || 0,
            ctr: metrics.ctr || 0,
            cvr: metrics.cvr || 0,
            roas: metrics.roas || 0,
          },
        }).catch(() => {}); // non-fatal
      }
    }

    await dispatchWebhook(uid, 'campaign.metrics_updated', { campaignId: campaign.id, metrics }).catch(() => {});

    return NextResponse.json({ metrics });
  } catch (e) {
    console.error('[ads/metrics] error:', String(e));
    return NextResponse.json({ error: 'metrics_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
