import { NextRequest, NextResponse } from 'next/server';
import { CompanyEmailService } from '@/lib/services/company-email';
import { safeError } from '@/lib/security';

/**
 * POST /api/email/inbound
 * Inbound email webhook (e.g. from Resend Inbound or Svix).
 *
 * Headers:
 *  - svix-id: the message ID
 *  - svix-signature: the Svix signature (v1,base64sig)
 *
 * Body: raw email payload (JSON or raw email)
 *
 * The route verifies the Svix signature (if SVIX_SECRET is configured),
 * extracts the organization slug from the to address, screens for prompt
 * injection, and creates a triage task.
 *
 * No authentication required — this is a webhook endpoint verified by signature.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const svixMsgId = req.headers.get('svix-id') || undefined;
    const svixSignature = req.headers.get('svix-signature') || undefined;

    // Parse the email payload
    let email;
    try {
      const parsed = JSON.parse(rawBody);
      // Resend inbound format: { from, to, subject, html, text }
      email = {
        from: parsed.from || parsed.sender || '',
        to: parsed.to || parsed.recipient || '',
        subject: parsed.subject || '',
        body: parsed.html || parsed.text || parsed.body || '',
        textBody: parsed.text,
        headers: parsed.headers,
      };
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const result = await CompanyEmailService.processInbound({
      email,
      svixMsgId,
      svixSignature,
      rawBody,
    });

    if (!result.success) {
      const status = result.error === 'invalid_svix_signature' ? 401 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ success: true, result });
  } catch (e) {
    return NextResponse.json(safeError(e, 'email/inbound', 'inbound_failed'), { status: 500 });
  }
}
