import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CompanyEmailService } from '@/lib/services/company-email';
import { safeError } from '@/lib/security';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/email/send
 * Send an outbound email from the company's email identity.
 *
 * Body:
 *  - organizationId: the organization to send from
 *  - to: recipient email
 *  - subject: email subject
 *  - body: email body (plain text)
 *  - fromName: optional display name
 *  - replyTo: optional reply-to address
 *
 * Requires authentication. The user must be a member of the organization.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { organizationId, to, subject, emailBody, fromName, replyTo } = body;

    if (!organizationId || !to || !subject || !emailBody) {
      return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
    }

    // Verify the user has access to this organization
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      select: { workspace: { select: { id: true, organizationId: true } } },
    });

    if (!membership || membership.workspace.organizationId !== organizationId) {
      return NextResponse.json({ error: 'no_access' }, { status: 403 });
    }

    const result = await CompanyEmailService.send({
      organizationId,
      workspaceId: membership.workspace.id,
      email: { to, subject, body: emailBody, fromName, replyTo },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (e) {
    return NextResponse.json(safeError(e, 'email/send', 'send_failed'), { status: 500 });
  }
}
