import { auth } from '@/../auth';

/**
 * Check if the current session user is an admin.
 * Admin emails are configured via the ADMIN_EMAILS env variable
 * (comma-separated list). This avoids requiring a schema migration.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(session.user.email.toLowerCase())) return null;

  return session;
}
