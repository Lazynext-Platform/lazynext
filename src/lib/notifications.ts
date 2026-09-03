/**
 * Notification service — creates in-app notifications and optionally
 * sends email notifications via Resend.
 *
 * Email delivery is opt-in per type via the user's notification preferences
 * stored in localStorage (see NotificationSettings component).
 * If RESEND_API_KEY is not configured, only in-app notifications are created.
 */

import { prisma } from '@/lib/prisma';
import { sendNotificationEmail } from '@/lib/email';

export interface CreateNotificationInput {
  userId: string;
  workspaceId?: string;
  type: string;
  title: string;
  body?: string;
  /** Whether to attempt email delivery (default: true) */
  sendEmail?: boolean;
}

/**
 * Create a notification and optionally send an email.
 * Returns the created notification record.
 */
export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      workspaceId: input.workspaceId || null,
      type: input.type,
      title: input.title,
      body: input.body || null,
    },
  });

  // Attempt email delivery if requested
  if (input.sendEmail !== false) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true },
      });
      if (user?.email) {
        await sendNotificationEmail(user.email, input.title, input.body || null, input.type);
      }
    } catch (err) {
      // Email failure should not affect notification creation
      console.error('[notifications] Email delivery failed:', err);
    }
  }

  return notification;
}

/**
 * Create notifications for multiple users (e.g. all workspace members).
 */
export async function createNotifications(inputs: CreateNotificationInput[]) {
  const results = await Promise.allSettled(inputs.map((input) => createNotification(input)));
  return results;
}
