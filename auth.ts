import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { grantCredits } from '@/lib/credits';

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
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
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
  trustHost: true,
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
    async jwt({ token, user }) {
      // On first sign-in, `user` is populated. Persist id and credits in the
      // JWT so the session callback can read them without a DB lookup.
      if (user) {
        token.id = user.id;
        token.credits = (user as { credits?: number }).credits ?? 0;
        token.creditsUpdatedAt = Date.now();
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
  pages: { signIn: '/' },
});

/**
 * Returns the list of enabled provider IDs for client-side rendering.
 * Used by the sign-in UI to show only configured providers.
 */
export function getEnabledProviderIds(): string[] {
  return ['google', 'credentials'];
}
