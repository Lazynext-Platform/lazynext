/**
 * Company Email Identity Service — per-company email sending and receiving.
 *
 * Inspired by openpolsia's company email identity, re-implemented natively
 * for Lazynext's Prisma + D1/SQLite stack.
 *
 * Features:
 *  - Outbound email via Resend ({slug}@mail.lazynext.com)
 *  - Inbound email webhook with Svix signature verification
 *  - Prompt-injection screening on inbound emails
 *  - Automatic triage task creation from inbound emails
 *  - Feature flags and local testability (no external credentials required)
 *
 * @see docs/research/external-reference-architectures.md
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { EventService } from '@/lib/services/event';
import { detectPromptInjection } from '@/lib/security';
import { createHmac } from 'node:crypto';

// ── Types ──

export interface OutboundEmail {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  replyTo?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  body: string;
  textBody?: string;
  headers?: Record<string, string>;
}

export interface InboundProcessResult {
  success: boolean;
  organizationSlug?: string;
  taskId?: string;
  injectionDetected: boolean;
  injectionPatterns: string[];
  error?: string;
}

// ── Svix Signature Verification ──

/**
 * Verify a Svix webhook signature.
 * Svix uses a HMAC-SHA256 signature with a rotating secret.
 *
 * Format: `v1,signature1,signature2,...`
 * Payload: `msgId.body`
 *
 * @see https://docs.svix.com/receiving/verifying-payloads/how
 */
export function verifySvixSignature(
  body: string,
  msgId: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!secret || !signatureHeader || !msgId) return false;

  // Parse the signature header: `v1,signature1,signature2`
  const parts = signatureHeader.split(',');
  const version = parts[0];
  if (version !== 'v1') return false;

  const signatures = parts.slice(1);
  if (signatures.length === 0) return false;

  // Compute the expected signature
  const message = `${msgId}.${body}`;
  const expectedSig = createHmac('sha256', secret)
    .update(message)
    .digest('base64');

  // Check if any of the provided signatures match
  return signatures.some(sig => timingSafeEqual(sig, expectedSig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ── Company Email Service ──

export const CompanyEmailService = {
  /**
   * Send an outbound email via Resend.
   * In dry-run mode (no RESEND_API_KEY), the email is logged as an event.
   */
  async send(input: {
    organizationId: string;
    workspaceId: string;
    email: OutboundEmail;
  }): Promise<SendResult> {
    const resendKey = process.env.RESEND_API_KEY;
    const mailDomain = process.env.MAIL_DOMAIN || 'mail.lazynext.com';

    // Get the organization slug for the from address
    const org = await safePrisma(() =>
      prisma.organization.findUnique({
        where: { id: input.organizationId },
        select: { slug: true },
      }),
    null);

    if (!org) {
      return { success: false, error: 'organization_not_found' };
    }

    const fromEmail = `${org.slug}@${mailDomain}`;

    // Dry-run mode: no Resend API key
    if (!resendKey || resendKey === 'mock-key-for-dev') {
      await EventService.emit({
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'email.outbound.dry_run',
        actor: 'system',
        actorType: 'system',
        metadata: {
          from: fromEmail,
          to: input.email.to,
          subject: input.email.subject,
          bodyLength: input.email.body.length,
        },
        source: 'company-email',
      }).catch(() => {});

      return { success: true, messageId: `dry-run-${Date.now()}` };
    }

    // Production mode: send via Resend API
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${input.email.fromName || org.slug} <${fromEmail}>`,
          to: input.email.to,
          subject: input.email.subject,
          text: input.email.body,
          ...(input.email.replyTo && { reply_to: input.email.replyTo }),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown');
        return { success: false, error: `resend_error: ${response.status} ${errorText}` };
      }

      const data = await response.json() as { id?: string };
      return { success: true, messageId: data.id };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'send_failed' };
    }
  },

  /**
   * Process an inbound email.
   * 1. Verify Svix signature (if enabled)
   * 2. Extract the organization slug from the to address
   * 3. Screen for prompt injection
   * 4. Create a triage task
   */
  async processInbound(input: {
    email: InboundEmail;
    svixMsgId?: string;
    svixSignature?: string;
    rawBody?: string;
  }): Promise<InboundProcessResult> {
    const svixSecret = process.env.SVIX_SECRET;

    // 1. Verify Svix signature (if configured)
    if (svixSecret && input.svixSignature && input.svixMsgId && input.rawBody) {
      const valid = verifySvixSignature(
        input.rawBody,
        input.svixMsgId,
        input.svixSignature,
        svixSecret,
      );
      if (!valid) {
        return {
          success: false,
          injectionDetected: false,
          injectionPatterns: [],
          error: 'invalid_svix_signature',
        };
      }
    }

    // 2. Extract organization slug from the to address
    const mailDomain = process.env.MAIL_DOMAIN || 'mail.lazynext.com';
    const toMatch = input.email.to.match(`^(.+)@${mailDomain.replace(/\./g, '\\.')}$`);
    if (!toMatch) {
      return {
        success: false,
        injectionDetected: false,
        injectionPatterns: [],
        error: 'unrecognized_to_address',
      };
    }

    const orgSlug = toMatch[1];

    // Find the organization
    const org = await safePrisma(() =>
      prisma.organization.findUnique({
        where: { slug: orgSlug },
        select: { id: true, defaultWorkspaceId: true },
      }),
    null);

    if (!org) {
      return {
        success: false,
        injectionDetected: false,
        injectionPatterns: [],
        error: 'organization_not_found',
      };
    }

    // 3. Screen for prompt injection
    const fullContent = `${input.email.subject}\n${input.email.body}`;
    const injectionResult = detectPromptInjection(fullContent);
    const injectionDetected = injectionResult.patterns.length > 0;

    // 4. Create a triage task
    let taskId: string | undefined;

    // Find or create a default project for email triage
    let workspaceId: string | null = org.defaultWorkspaceId || null;
    if (!workspaceId) {
      const ws = await safePrisma(() =>
        prisma.workspace.findFirst({
          where: { organizationId: org.id },
          select: { id: true },
        }),
      null);
      workspaceId = ws?.id || null;
    }

    if (workspaceId) {
      let project = await safePrisma(() =>
        prisma.project.findFirst({
          where: { workspaceId, name: 'Email Triage' },
        }),
      null);

      if (!project) {
        project = await prisma.project.create({
          data: {
            workspaceId,
            name: 'Email Triage',
            description: 'Auto-created tasks from inbound emails',
            createdById: 'system',
          },
        }).catch(() => null);
      }

      if (project) {
        const task = await prisma.task.create({
          data: {
            projectId: project.id,
            title: `[Email] ${input.email.subject.slice(0, 200)}`,
            description: `From: ${input.email.from}\nTo: ${input.email.to}\nSubject: ${input.email.subject}\n\n${input.email.body.slice(0, 5000)}${injectionDetected ? '\n\n⚠️ PROMPT INJECTION DETECTED — review carefully' : ''}`,
            status: 'todo',
            priority: injectionDetected ? 'high' : 'medium',
          },
        }).catch(() => null);

        if (task) taskId = task.id;
      }
    }

    // 5. Emit event
    await EventService.emit({
      workspaceId: workspaceId || undefined,
      organizationId: org.id,
      type: 'email.inbound.received',
      actor: 'system',
      actorType: 'system',
      resourceType: 'task',
      resourceId: taskId,
      metadata: {
        from: input.email.from,
        to: input.email.to,
        subject: input.email.subject.slice(0, 200),
        injectionDetected,
        injectionPatterns: injectionResult.patterns,
        taskId,
      },
      source: 'company-email',
    }).catch(() => {});

    return {
      success: true,
      organizationSlug: orgSlug,
      taskId,
      injectionDetected,
      injectionPatterns: injectionResult.patterns,
    };
  },
};
