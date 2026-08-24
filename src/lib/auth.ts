import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import KakaoProvider from 'next-auth/providers/kakao';
import LineProvider from 'next-auth/providers/line';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { grantCredits } from '@/lib/credits';

/**
 * Build the list of auth providers based on available environment credentials.
 * Google is always registered (existing behaviour). Apple, Kakao, LINE, and
 * WeChat are only registered when their credentials are present so incomplete
 * providers never appear in the sign-in UI.
 *
 * WeChat does not have a built-in next-auth provider, so we use a generic
 * OAuth2 provider structure with WeChat's Open Platform endpoints.
 */
function buildProviders() {
  const providers = [];

  // Google — always enabled
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  );

  // Apple Sign In — gated by env
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
    providers.push(
      AppleProvider({
        clientId: process.env.APPLE_CLIENT_ID,
        clientSecret: process.env.APPLE_CLIENT_SECRET,
        // Apple requires a scope of "name email" and a specific callback URL
        authorization: {
          params: {
            scope: 'name email',
            response_mode: 'form_post',
          },
        },
        // tokenEndpoint is the same as the default but we set it explicitly for clarity
        token: {
          url: 'https://appleid.apple.com/auth/token',
          contentType: 'application/x-www-form-urlencoded',
        },
        userinfo: {
          url: 'https://appleid.apple.com/auth/keys',
        },
        profile(profile: { sub: string; email: string }) {
          return {
            id: profile.sub,
            email: profile.email,
            name: profile.email?.split('@')[0] || 'Apple User',
          };
        },
      } as any),
    );
  }

  // Kakao — gated by env
  if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
    providers.push(
      KakaoProvider({
        clientId: process.env.KAKAO_CLIENT_ID,
        clientSecret: process.env.KAKAO_CLIENT_SECRET,
      }),
    );
  }

  // LINE — gated by env
  if (process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET) {
    providers.push(
      LineProvider({
        clientId: process.env.LINE_CLIENT_ID,
        clientSecret: process.env.LINE_CLIENT_SECRET,
        // LINE requires a bot prompt for the consent screen
        authorization: {
          params: {
            bot_prompt: 'normal',
          },
        },
      }),
    );
  }

  // WeChat — gated by env (custom OAuth2 provider)
  // WeChat Open Platform requires a separate app registration.
  // The structure below follows WeChat's OAuth 2.0 web flow.
  if (process.env.WECHAT_CLIENT_ID && process.env.WECHAT_CLIENT_SECRET) {
    providers.push({
      id: 'wechat',
      name: 'WeChat',
      type: 'oauth',
      clientId: process.env.WECHAT_CLIENT_ID,
      clientSecret: process.env.WECHAT_CLIENT_SECRET,
      wellKnown: undefined,
      authorization: {
        url: 'https://open.weixin.qq.com/connect/qrconnect',
        params: {
          appid: process.env.WECHAT_CLIENT_ID,
          scope: 'snsapi_login',
          response_type: 'code',
        },
      },
      token: {
        url: 'https://api.weixin.qq.com/sns/oauth2/access_token',
        params: {
          grant_type: 'authorization_code',
        },
      },
      userinfo: {
        url: 'https://api.weixin.qq.com/sns/userinfo',
      },
      profile(profile: { openid: string; nickname: string; headimgurl?: string }) {
        return {
          id: profile.openid,
          name: profile.nickname,
          image: profile.headimgurl || null,
          email: null,
        };
      },
      checks: ['state'],
    } as any);
  }

  return providers;
}

// In local development (http://localhost), NextAuth would otherwise use __Secure-
// prefixed cookies when NEXTAUTH_URL points at https. Chromium refuses to send
// __Secure- cookies over plain http, so local auth silently breaks. Force the
// non-secure cookie names whenever NEXTAUTH_URL is a localhost URL so local dev
// works regardless of what NODE_ENV is (the OpenNext build sets NODE_ENV=production
// at build time, so we can't rely on it for this runtime decision).
const nextAuthUrl = process.env.NEXTAUTH_URL || '';
const useSecureCookies = nextAuthUrl.startsWith('https://') && !nextAuthUrl.includes('localhost');
const cookiePrefix = useSecureCookies ? '__Secure-' : '';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: useSecureCookies,
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: buildProviders(),
  session: { strategy: 'database' },
  // Explicitly tell NextAuth not to use __Secure- cookies in dev. Without this,
  // it falls back to url.base.startsWith("https://") which is true when
  // NEXTAUTH_URL is misconfigured to the production URL in local .env.
  useSecureCookies,
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
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.credits = (user as { credits?: number }).credits ?? 0;
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
};

/**
 * Returns the list of enabled provider IDs for client-side rendering.
 * Used by the sign-in UI to show only configured providers.
 */
export function getEnabledProviderIds(): string[] {
  return authOptions.providers.map((p) => (p as { id: string }).id);
}
