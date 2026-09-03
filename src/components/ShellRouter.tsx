'use client';

import { usePathname } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { OsShell } from '@/components/OsShell';

// Routes that use the new OS shell (authenticated OS routes)
const OS_SHELL_ROUTES = [
  '/dashboard',
  '/projects',
  '/tasks',
  '/documents',
  '/files',
  '/creative',
  '/automations',
  '/agents',
  '/integrations',
  '/calendar',
  '/analytics',
  '/search',
  '/settings',
  '/workspaces',
  '/admin',
  '/developers',
  '/people',
  '/conversations',
  '/mcp-server',
  '/onboarding',
  '/observability',
];

// Routes that should have NO shell (auth, marketing, legal)
const NO_SHELL_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/verify-email',
  '/pricing',
  '/terms',
  '/privacy',
  '/cookies',
  '/acceptable-use',
  '/ai-policy',
  '/ai-usage-policy',
  '/api-terms',
  '/dpa',
  '/subprocessors',
  '/security',
  '/data-request',
  '/status',
];

const LOCALE_RE = /^\/(en|zh|ja|es|ko|pt|fr|de|ar|hi|vi|th|id)(?=\/|$)/;

function normalize(path: string): string {
  return path.replace(LOCALE_RE, '') || '/';
}

function startsWithAny(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(p + '/'));
}

/**
 * Routes children through the appropriate shell based on the current path.
 * - New OS routes → OsShell (Neo-Brutalist OS app shell)
 * - Auth/marketing/legal routes → no shell (full-page render)
 * - All other existing routes → legacy Shell (preserved during migration)
 */
export function ShellRouter({ children }: { children: React.ReactNode }) {
  const raw = usePathname() || '/';
  const p = normalize(raw);

  // No shell for auth/marketing/legal pages
  if (startsWithAny(p, NO_SHELL_ROUTES)) {
    return <>{children}</>;
  }

  // OS shell for new platform routes
  if (startsWithAny(p, OS_SHELL_ROUTES)) {
    return <OsShell>{children}</OsShell>;
  }

  // Check if this looks like a 404 (not a known legacy route pattern).
  // Legacy creative/editor/studio routes keep the old shell; everything
  // else (unknown paths → not-found page) gets no shell.
  const LEGACY_PREFIXES = [
    '/ads', '/audio-studio', '/brand-voice', '/brief', '/campaign',
    '/clip-editor', '/competitor', '/compliance', '/creative-',
    '/drama-studio', '/editor', '/fatigue', '/forecasting', '/google-safety',
    '/image-studio', '/inspiration', '/ml-insights', '/my-work',
    '/narrative-studio', '/performance', '/personas', '/pipeline',
    '/publish', '/quality-scoring', '/repurposing', '/scene-analysis',
    '/shot-planner', '/skills', '/skill-chains', '/templates',
    '/ugc-studio', '/workflow-builder', '/teams', '/approvals',
    '/assets', '/meta-safety', '/multi-concept', '/product-brief',
    '/reference-remix', '/viral-analyzer', '/performance-loop',
  ];

  if (startsWithAny(p, LEGACY_PREFIXES)) {
    return <Shell>{children}</Shell>;
  }

  // Unknown route → no shell (clean 404 page)
  return <>{children}</>;
}
