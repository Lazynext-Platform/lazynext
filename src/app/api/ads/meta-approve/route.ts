import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { safeError } from '@/lib/security';
import {
  getPendingApprovals,
  getApprovalRequest,
  approveRequest,
  rejectRequest,
} from '@/lib/ads/meta-safety';

export const maxDuration = 60;

async function isAdmin(uid: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) return false;
  const user = await prisma.user
    .findUnique({ where: { id: uid }, select: { email: true } })
    .catch(() => null);
  if (!user?.email) return false;
  return adminEmails.includes(user.email.toLowerCase());
}

async function __byokGET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ pending: getPendingApprovals() });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      action?: 'approve' | 'reject';
      approver?: string;
    };

    if (!body.id) {
      return NextResponse.json({ error: 'id_required' }, { status: 400 });
    }
    const action = body.action === 'reject' ? 'reject' : 'approve';
    const approver = body.approver || session.user.email || session.user.id;

    const existing = getApprovalRequest(body.id);
    if (!existing) {
      return NextResponse.json({ error: 'request_not_found' }, { status: 404 });
    }
    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: 'request_not_pending', status: existing.status },
        { status: 400 },
      );
    }

    const updated =
      action === 'approve'
        ? approveRequest(body.id, approver)
        : rejectRequest(body.id, approver);

    return NextResponse.json({ request: updated });
  } catch (e) {
    return NextResponse.json(safeError(e, 'ads/meta-approve', 'approval_failed'), {
      status: 500,
    });
  }
}

export const GET = withAtlas(__byokGET);
export const POST = withAtlas(__byokPOST);
