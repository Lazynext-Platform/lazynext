import { Resend } from 'resend';

/**
 * Email sending utility using Resend.
 * Get your API key at https://resend.com/api-keys
 * Set it as RESEND_API_KEY in Cloudflare Worker secrets.
 *
 * The "from" address must be a verified domain in your Resend account.
 * Set FROM_EMAIL in your env (e.g. "Lazynext <noreply@lazynext.com>").
 * If FROM_EMAIL is not set, falls back to onboarding@resend.dev
 * (Resend's default sandbox address — only works for your own email).
 */

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

const FROM = process.env.FROM_EMAIL || 'Lazynext <onboarding@resend.dev>';
const APP_URL = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'https://lazynext.com';

export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.warn('[email] RESEND_API_KEY not set — skipping verification email');
    return false;
  }
  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${token}`;
  try {
    const { error } = await client.emails.send({
      from: FROM,
      to: email,
      subject: 'Verify your Lazynext account',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #131416;">Welcome to Lazynext!</h2>
          <p style="color: #555; font-size: 15px;">Please verify your email address to activate your account:</p>
          <a href="${verifyUrl}" style="display: inline-block; margin: 16px 0; padding: 12px 28px; background: #00b2fc; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email</a>
          <p style="color: #999; font-size: 13px;">Or copy this link: ${verifyUrl}</p>
          <p style="color: #999; font-size: 13px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
        </div>
      `,
    });
    if (error) {
      console.error('[email] Resend error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Failed to send verification email:', err);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.warn('[email] RESEND_API_KEY not set — skipping password reset email');
    return false;
  }
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  try {
    const { error } = await client.emails.send({
      from: FROM,
      to: email,
      subject: 'Reset your Lazynext password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #131416;">Reset your password</h2>
          <p style="color: #555; font-size: 15px;">We received a request to reset your Lazynext password. Click the button below to choose a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; margin: 16px 0; padding: 12px 28px; background: #00b2fc; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          <p style="color: #999; font-size: 13px;">Or copy this link: ${resetUrl}</p>
          <p style="color: #999; font-size: 13px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });
    if (error) {
      console.error('[email] Resend error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Failed to send password reset email:', err);
    return false;
  }
}
