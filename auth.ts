import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { grantCredits } from '@/lib/credits';
import { verifyTOTP } from '@/lib/mfa';
import { isSessionRevoked } from '@/lib/session-revocation';

// Account lockout: track failed login attempts per email.
// After 5 failed attempts within 15 minutes, the account is locked for 15 minutes.
// Note: in-memory on Workers isolates — Cloudflare rate limiter provides
// distributed protection. This is an additional per-account layer.
type FailData = { count: number; resetAt: number };
type LockData = { lockedUntil: number };
const accountLocks = new Map<string, LockData>();
const failedAttempts = new Map<string, FailData>();

// In local development (http://localhost), NextAuth would otherwise use __Secure-
// prefixed cookies when NEXTAUTH_URL points at https. Chromium refuses to send
// __Secure- cookies over plain http, so local auth silently breaks. Force the
// non-secure cookie names whenever NEXTAUTH_URL is a localhost URL so local dev
// works regardless of what NODE_ENV is (the OpenNext build sets NODE_ENV=production
// at build time, so we can't rely on it for this runtime decision).
const nextAuthUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || '';
const useSecureCookies = nextAuthUrl.startsWith('https://') && !nextAuthUrl.includes('localhost');
const cookiePrefix = useSecureCookies ? '__Secure-' : '';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: useSecureCookies,
};

// OAuth flow cookies (state, PKCE verifier) must be sent on the cross-site
// redirect from Google back to our callback URL. SameSite=Lax cookies set via
// fetch() responses are not reliably sent on cross-site top-level redirects in
// modern Chrome (the 2-minute Lax+POST mitigation and third-party cookie
// restrictions interfere). Use SameSite=None + Secure so the state and PKCE
// cookies survive the Google → lazynext.com redirect.
const oauthCookieOptions = {
  httpOnly: true,
  sameSite: 'none' as const,
  path: '/',
  secure: true,
  maxAge: 60 * 15,
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // Google OAuth — always enabled
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),

    // Email + password credentials
    Credentials({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totpCode: { label: 'MFA Code', type: 'text' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const totpCode = credentials?.totpCode as string | undefined;
        if (!email || !password) return null;

        const lowerEmail = email.toLowerCase();

        // Account lockout: track failed attempts per email.
        // After 5 failed attempts, lock the account for 15 minutes.
        // Note: in-memory on Workers isolates — Cloudflare rate limiter
        // provides distributed protection. This is an additional layer.
        const lockKey = `lock:${lowerEmail}`;
        const lockData = accountLocks.get(lockKey);
        const now = Date.now();
        if (lockData && lockData.lockedUntil > now) {
          return null; // Account is locked
        }

        const user = await prisma.user.findUnique({
          where: { email: lowerEmail },
        });
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          // Record failed attempt
          const failKey = `fail:${lowerEmail}`;
          const failData = failedAttempts.get(failKey);
          if (failData && failData.resetAt > now) {
            failData.count++;
            if (failData.count >= 5) {
              // Lock the account for 15 minutes
              accountLocks.set(lockKey, { lockedUntil: now + 15 * 60 * 1000 });
              failedAttempts.delete(failKey);
            }
          } else {
            failedAttempts.set(failKey, { count: 1, resetAt: now + 15 * 60 * 1000 });
          }
          return null;
        }

        // Enforce email verification for credentials login.
        // Google OAuth users get emailVerified set automatically by NextAuth.
        // In development/test, set ENFORCE_EMAIL_VERIFICATION=false to bypass.
        const enforceVerification = process.env.ENFORCE_EMAIL_VERIFICATION !== 'false';
        if (enforceVerification && !user.emailVerified) {
          // Return a special error indicator — the signIn callback will
          // redirect to a "verify your email" page instead of showing
          // a generic "invalid credentials" error.
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        // MFA check: if the user has MFA enabled, verify the TOTP code.
        // The client collects the code via a second step after password validation.
        if (user.mfaEnabled && user.mfaSecret) {
          if (!totpCode) {
            // Password is correct but MFA code is required.
            // The client should show an MFA input field and retry with totpCode.
            throw new Error('MFA_REQUIRED');
          }
          const mfaValid = await verifyTOTP(user.mfaSecret, totpCode);
          if (!mfaValid) {
            // MFA failures also count toward account lockout to prevent
            // TOTP brute-force attacks by someone who knows the password.
            const failKey = `fail:${lowerEmail}`;
            const failData = failedAttempts.get(failKey);
            if (failData && failData.resetAt > now) {
              failData.count++;
              if (failData.count >= 5) {
                accountLocks.set(lockKey, { lockedUntil: now + 15 * 60 * 1000 });
                failedAttempts.delete(failKey);
              }
            } else {
              failedAttempts.set(failKey, { count: 1, resetAt: now + 15 * 60 * 1000 });
            }
            throw new Error('MFA_INVALID');
          }
        }

        // Successful login — clear any failed attempt records
        failedAttempts.delete(`fail:${lowerEmail}`);
        accountLocks.delete(lockKey);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          credits: user.credits,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  useSecureCookies,
  // Only trust host in local development; in production, NextAuth validates
  // the host/origin to prevent host-header injection and callback-URL tampering.
  trustHost: process.env.NODE_ENV !== 'production',
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: cookieOptions,
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: cookieOptions,
    },
    csrfToken: {
      name: `${useSecureCookies ? '__Host-' : ''}next-auth.csrf-token`,
      options: { ...cookieOptions, secure: useSecureCookies },
    },
    state: {
      name: `${cookiePrefix}next-auth.state`,
      options: useSecureCookies ? oauthCookieOptions : { ...oauthCookieOptions, secure: false, sameSite: 'lax' as const },
    },
    pkceCodeVerifier: {
      name: `${cookiePrefix}next-auth.pkce.code_verifier`,
      options: useSecureCookies ? oauthCookieOptions : { ...oauthCookieOptions, secure: false, sameSite: 'lax' as const },
    },
  },
  callbacks: {
    async signIn() {
      // Email verification and MFA checks are handled in the authorize()
      // callback above. When authorize() throws, NextAuth sets result.error
      // on the client side, which the login page reads to show the appropriate
      // message. No additional blocking is needed here.
      return true;
    },
    async jwt({ token, user }) {
      // On first sign-in, `user` is populated. Persist id and credits in the
      // JWT so the session callback can read them without a DB lookup.
      if (user) {
        token.id = user.id;
        token.credits = (user as { credits?: number }).credits ?? 0;
        token.creditsUpdatedAt = Date.now();

        // Create a Session row for revocation tracking.
        // With JWT strategy, NextAuth doesn't create Session rows automatically.
        // We create one so that revokeAllUserSessions() can mark it as revoked.
        try {
          const sessionToken = randomUUID();
          const { createHash } = await import('crypto');
          const sessionTokenHash = createHash('sha256').update(sessionToken).digest('hex');
          await prisma.session.create({
            data: {
              sessionToken: sessionTokenHash,
              userId: user.id!,
              expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
          });
          token.sessionToken = sessionToken;
        } catch {
          // Non-fatal: session revocation won't work for this session,
          // but the user can still log in
        }
      }

      // Check if session has been revoked (logout-all, admin force-logout).
      // Cached for 60s to avoid a DB lookup on every auth() call.
      if (token.sessionToken && token.id) {
        const revoked = await isSessionRevoked(token.sessionToken as string);
        if (revoked) {
          // Return a minimal token that won't authenticate
          return { ...token, id: undefined, credits: 0, sessionToken: undefined } as typeof token;
        }
      }

// Refresh credits from DB if stale (older than 5 minutes) to avoid
// showing a stale balance after spending/refunding credits. The 5-minute
// window reduces DB reads on every auth() call (154 API routes) while
// keeping the UI balance reasonably fresh. API routes that need
// authoritative credit checks use deductCredits() which reads from the DB
// directly, not the JWT value. The /api/me endpoint provides the freshest
// balance for UI updates after purchases.
const CREDIT_REFRESH_MS = 5 * 60_000;
      if (token.id && (!token.creditsUpdatedAt || Date.now() - (token.creditsUpdatedAt as number) > CREDIT_REFRESH_MS)) {
        try {
          const { prisma } = await import('@/lib/prisma');
          const u = await prisma.user.findUnique({ where: { id: token.id as string }, select: { credits: true } });
          if (u) {
            token.credits = u.credits;
            token.creditsUpdatedAt = Date.now();
          }
        } catch {
          // DB lookup failed — keep the existing token value
        }
      }
      return token;
    },
    async session({ session, token }) {
      // With JWT strategy, derive the session from the token.
      if (token) {
        session.user = {
          id: token.id as string,
          name: session.user?.name ?? token.name ?? null,
          email: session.user?.email ?? token.email ?? null,
          image: session.user?.image ?? token.picture ?? null,
          credits: token.credits as number ?? 0,
        } as any;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const bonus = parseInt(process.env.SIGNUP_BONUS_CREDITS || '0', 10);
      if (bonus > 0 && user.id) await grantCredits(user.id, bonus, 'signup');
    },
  },
  pages: { signIn: '/login' },
});

/**
 * Returns the list of enabled provider IDs for client-side rendering.
 * Used by the sign-in UI to show only configured providers.
 */
export function getEnabledProviderIds(): string[] {
  return ['google', 'credentials'];
}
