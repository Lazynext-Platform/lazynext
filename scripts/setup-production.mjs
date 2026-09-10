#!/usr/bin/env node
/**
 * Production Setup Guide for Lazynext
 * 
 * This script checks for required production credentials and guides
 * you through obtaining them. Run before deploying to production.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const REQUIRED_ENV = [
  {
    key: 'CLOUDFLARE_API_TOKEN',
    description: 'Cloudflare API token for Workers deployment',
    instructions: 'Get from: https://dash.cloudflare.com/profile/api-tokens\nCreate a token with "Edit Cloudflare Workers" permission.',
    blocker: 'B1',
  },
  {
    key: 'ATLASCLOUD_API_KEY',
    description: 'Atlas Cloud API key for AI generation',
    instructions: 'Get from your Atlas Cloud dashboard.\nSet ATLASCLOUD_BASE and ATLASCLOUD_LLM_BASE to production URLs.',
    blocker: 'B2',
  },
  {
    key: 'AUTH_SECRET',
    description: 'NextAuth secret for JWT session encryption',
    instructions: 'Generate with: openssl rand -base64 32',
    blocker: null,
  },
  {
    key: 'NEXTAUTH_URL',
    description: 'Production URL for NextAuth callbacks',
    instructions: 'Set to your production URL, e.g., https://app.lazynext.com',
    blocker: null,
  },
  {
    key: 'AUTH_URL',
    description: 'Production URL for auth redirects',
    instructions: 'Set to your production URL, e.g., https://app.lazynext.com',
    blocker: null,
  },
  {
    key: 'GOOGLE_CLIENT_ID',
    description: 'Google OAuth client ID',
    instructions: 'Get from: https://console.cloud.google.com/apis/credentials',
    blocker: null,
  },
  {
    key: 'GOOGLE_CLIENT_SECRET',
    description: 'Google OAuth client secret',
    instructions: 'Get from: https://console.cloud.google.com/apis/credentials',
    blocker: null,
  },
  {
    key: 'DODO_CLIENT_ID',
    description: 'Dodo Payments client ID',
    instructions: 'Get from your Dodo Payments dashboard.',
    blocker: null,
  },
  {
    key: 'DODO_CLIENT_SECRET',
    description: 'Dodo Payments client secret',
    instructions: 'Get from your Dodo Payments dashboard.',
    blocker: null,
  },
  {
    key: 'TOKEN_ENCRYPTION_KEY',
    description: 'Encryption key for OAuth token storage',
    instructions: 'Generate with: openssl rand -base64 32\nREQUIRED in production (no dev fallback).',
    blocker: 'R25',
  },
];

const OPTIONAL_ENV = [
  { key: 'RESEND_API_KEY', description: 'Resend email API key' },
  { key: 'GOOGLE_ADS_CLIENT_ID', description: 'Google Ads client ID' },
  { key: 'GOOGLE_ADS_CLIENT_SECRET', description: 'Google Ads client secret' },
  { key: 'GOOGLE_ADS_DEVELOPER_TOKEN', description: 'Google Ads developer token' },
  { key: 'META_APP_ID', description: 'Meta Ads app ID' },
  { key: 'META_APP_SECRET', description: 'Meta Ads app secret' },
  { key: 'META_ACCESS_TOKEN', description: 'Meta Ads access token' },
  { key: 'GA4_PROPERTY_ID', description: 'Google Analytics 4 property ID' },
];

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║   Lazynext Production Setup Checker                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Check .env.local or .env.production
const envPath = resolve(process.cwd(), '.env.local');
const envExists = existsSync(envPath);
const envContent = envExists ? readFileSync(envPath, 'utf-8') : '';

console.log(`Checking: ${envPath}`);
console.log(`Status: ${envExists ? 'EXISTS' : 'NOT FOUND'}\n`);

let missingRequired = 0;
let missingOptional = 0;

console.log('── Required Environment Variables ──\n');
for (const env of REQUIRED_ENV) {
  const has = envContent.includes(`${env.key}=`) && !envContent.includes(`${env.key}=your-`) && !envContent.includes(`${env.key}=mock-`);
  const status = has ? '✅' : '❌';
  const blockerNote = env.blocker ? ` [${env.blocker}]` : '';
  console.log(`${status} ${env.key}${blockerNote}`);
  console.log(`   ${env.description}`);
  if (!has) {
    console.log(`   → ${env.instructions}`);
    missingRequired++;
  }
  console.log();
}

console.log('── Optional Environment Variables ──\n');
for (const env of OPTIONAL_ENV) {
  const has = envContent.includes(`${env.key}=`) && !envContent.includes(`${env.key}=your-`);
  const status = has ? '✅' : '⚠️';
  console.log(`${status} ${env.key}: ${env.description}`);
  if (!has) missingOptional++;
}

console.log('\n── Summary ──');
console.log(`Required: ${REQUIRED_ENV.length - missingRequired}/${REQUIRED_ENV.length} configured`);
console.log(`Optional: ${OPTIONAL_ENV.length - missingOptional}/${OPTIONAL_ENV.length} configured`);

if (missingRequired > 0) {
  console.log(`\n❌ ${missingRequired} required environment variable(s) missing.`);
  console.log('   Add them to .env.local before deploying to production.\n');
  if (missingRequired === REQUIRED_ENV.length) {
    console.log('   To create a template:');
    console.log('   cp .env.example .env.local');
    console.log('   Then edit .env.local with your production values.\n');
  }
} else {
  console.log('\n✅ All required environment variables are configured!');
  console.log('   You can deploy with: npm run deploy\n');
}

// Check wrangler.jsonc
const wranglerPath = resolve(process.cwd(), 'wrangler.jsonc');
if (existsSync(wranglerPath)) {
  const wrangler = readFileSync(wranglerPath, 'utf-8');
  const hasR2 = wrangler.includes('r2_buckets') && !wrangler.includes('"r2_buckets": []');
  const hasD1 = wrangler.includes('d1_databases');
  const hasRateLimit = wrangler.includes('ratelimits') || wrangler.includes('RATE_LIMITER');
  console.log('── Cloudflare Bindings ──');
  console.log(`  R2 Buckets: ${hasR2 ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  D1 Database: ${hasD1 ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  Rate Limiter: ${hasRateLimit ? '✅ Configured' : '❌ Missing'}`);
  console.log();
}
