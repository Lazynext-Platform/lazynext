import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { googleAds } from '@/lib/ad-platforms/google';
import type { PublishOptions } from '@/lib/ad-platforms/types';
import { dispatchWebhook } from '@/lib/webhooks';

export const maxDuration = 60;

/**
 * GET /api/ads/google-report?campaignId=...
 * Fetch a detailed Google Ads performance report (search terms, keywords,
 * ad groups, device breakdown).
 *
 * Mirrors /api/ads/report but is scoped to Google campaigns only. Defaults
 * to dry-run for safety; verifies campaign ownership before calling the
 * provider.
 */
async function __byokGET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const campaignId = (url.searchParams.get('campaignId') || '').slice(0, 100);
  if (!campaignId) return NextResponse.json({ error: 'campaignId_required' }, { status: 400 });

  // Verify ownership
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, userId: uid },
  }).catch(() => null);

  if (!campaign) return NextResponse.json({ error: 'campaign_not_found' }, { status: 404 });

  // This route is scoped to Google campaigns only.
  if (campaign.platform !== 'google') {
    return NextResponse.json({ error: 'not_a_google_campaign' }, { status: 400 });
  }

  const dryRun = url.searchParams.get('dryRun') !== 'false'; // default dry-run for safety
  const requireApproval = url.searchParams.get('requireApproval') !== 'false';
  const spendCapRaw = url.searchParams.get('spendCap');
  const spendCap = spendCapRaw ? Number(spendCapRaw) : undefined;

  const opts: PublishOptions = {
    dryRun,
    requireApproval,
    spendCap: typeof spendCap === 'number' && Number.isFinite(spendCap) ? spendCap : undefined,
  };

  if (!googleAds.getReport) {
    return NextResponse.json({ error: 'report_unsupported_for_platform' }, { status: 400 });
  }

  try {
    const report = await googleAds.getReport(campaign.campaignId || campaign.id, opts);

    await dispatchWebhook(uid, 'campaign.report_generated', {
      campaignId: campaign.id,
      platform: 'google',
      dryRun: opts.dryRun,
    }).catch(() => {});

    return NextResponse.json({ report });
  } catch (e) {
    console.error('[ads/google-report] error:', String(e));
    return NextResponse.json({ error: 'report_failed' }, { status: 500 });
  }
}

export const GET = withAtlas(__byokGET);
