import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/editor/timeline-versions?timelineId=<id>
 * Returns version history for a timeline (ownership verified).
 * Or: /api/editor/timeline-versions?timelineId=<id>&versionNum=3
 * Returns a specific version snapshot.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const timelineId = url.searchParams.get('timelineId');
  const versionNum = url.searchParams.get('versionNum');

  if (!timelineId) return NextResponse.json({ error: 'timelineId_required' }, { status: 400 });

  // Verify ownership of the parent timeline
  const timeline = await prisma.timeline.findFirst({ where: { id: timelineId, userId: uid } });
  if (!timeline) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (versionNum) {
    const version = await prisma.timelineVersion.findFirst({
      where: { timelineId, versionNum: Number(versionNum) },
    });
    if (!version) return NextResponse.json({ error: 'version_not_found' }, { status: 404 });
    return NextResponse.json({ version });
  }

  const versions = await prisma.timelineVersion.findMany({
    where: { timelineId },
    orderBy: { versionNum: 'desc' },
  });

  return NextResponse.json({ versions });
}

/**
 * POST /api/editor/timeline-versions
 * Body: { timelineId, name?, tracksJson?, markersJson?, durationSec? }
 * Creates a new version snapshot for the timeline.
 * If tracks/markers are not provided, snapshots the current timeline state.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const timelineId = String(body.timelineId || '');
  if (!timelineId) return NextResponse.json({ error: 'timelineId_required' }, { status: 400 });

  // Verify ownership
  const timeline = await prisma.timeline.findFirst({ where: { id: timelineId, userId: uid } });
  if (!timeline) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Get the next version number
  const latest = await prisma.timelineVersion.findFirst({
    where: { timelineId },
    orderBy: { versionNum: 'desc' },
  });
  const nextVersionNum = (latest?.versionNum ?? 0) + 1;

  const version = await prisma.timelineVersion.create({
    data: {
      timelineId,
      versionNum: nextVersionNum,
      name: String(body.name || `Version ${nextVersionNum}`).slice(0, 100),
      tracksJson: String(body.tracksJson ?? timeline.tracksJson),
      markersJson: String(body.markersJson ?? timeline.markersJson),
      durationSec: typeof body.durationSec === 'number' ? body.durationSec : timeline.durationSec,
    },
  });

  return NextResponse.json({ version });
}

/**
 * PUT /api/editor/timeline-versions?timelineId=<id>&versionNum=<n>
 * Restores a specific version: copies the version's tracks/markers back to the timeline.
 */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const timelineId = url.searchParams.get('timelineId');
  const versionNum = url.searchParams.get('versionNum');
  if (!timelineId || !versionNum) return NextResponse.json({ error: 'timelineId_and_versionNum_required' }, { status: 400 });

  // Verify ownership
  const timeline = await prisma.timeline.findFirst({ where: { id: timelineId, userId: uid } });
  if (!timeline) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const version = await prisma.timelineVersion.findFirst({
    where: { timelineId, versionNum: Number(versionNum) },
  });
  if (!version) return NextResponse.json({ error: 'version_not_found' }, { status: 404 });

  // Create a snapshot of the current state before restoring (so the restore is itself undoable)
  const latest = await prisma.timelineVersion.findFirst({
    where: { timelineId },
    orderBy: { versionNum: 'desc' },
  });
  const nextVersionNum = (latest?.versionNum ?? 0) + 1;
  await prisma.timelineVersion.create({
    data: {
      timelineId,
      versionNum: nextVersionNum,
      name: `Before restore v${version.versionNum}`,
      tracksJson: timeline.tracksJson,
      markersJson: timeline.markersJson,
      durationSec: timeline.durationSec,
    },
  });

  // Restore the timeline from the version
  const updated = await prisma.timeline.update({
    where: { id: timelineId },
    data: {
      tracksJson: version.tracksJson,
      markersJson: version.markersJson,
      durationSec: version.durationSec,
    },
  });

  return NextResponse.json({ timeline: updated, restoredFrom: version });
}

/**
 * DELETE /api/editor/timeline-versions?timelineId=<id>&versionNum=<n>
 * Deletes a specific version (ownership verified).
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const timelineId = url.searchParams.get('timelineId');
  const versionNum = url.searchParams.get('versionNum');
  if (!timelineId || !versionNum) return NextResponse.json({ error: 'timelineId_and_versionNum_required' }, { status: 400 });

  // Verify ownership
  const timeline = await prisma.timeline.findFirst({ where: { id: timelineId, userId: uid } });
  if (!timeline) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await prisma.timelineVersion.deleteMany({
    where: { timelineId, versionNum: Number(versionNum) },
  });

  return NextResponse.json({ deleted: true });
}
