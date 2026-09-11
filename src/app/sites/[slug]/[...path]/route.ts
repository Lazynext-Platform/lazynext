import { NextRequest, NextResponse } from 'next/server';
import { PublicSitesService } from '@/lib/services/public-sites';

/**
 * GET /sites/[slug]/[...path]
 * Public route — serves published documents for a company's public website.
 * No authentication required.
 *
 * Also supports wildcard subdomain routing ({slug}.lazynext.com) when
 * SITES_WILDCARD_ENABLED=true.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path?: string[] }> },
) {
  const { slug, path } = await params;
  const publishSlug = path?.[0] || 'index';

  // Check for wildcard subdomain routing
  const host = req.headers.get('host') || '';
  const wildcardSlug = PublicSitesService.resolveOrgSlugFromHost(host);
  const orgSlug = wildcardSlug || slug;

  // Get the published page
  const page = await PublicSitesService.getPublicPage(orgSlug, publishSlug);

  if (!page) {
    return NextResponse.json({ error: 'page_not_found' }, { status: 404 });
  }

  // Return the page content as HTML
  const html = renderPage(page);
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderPage(page: {
  title: string;
  content: string;
  organizationSlug: string;
  publishSlug: string;
}): string {
  // Simple markdown-to-HTML rendering (basic)
  const htmlContent = page.content
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem 1rem; line-height: 1.6; color: #1a1a1a; }
    h1 { font-size: 2rem; margin-top: 2rem; }
    h2 { font-size: 1.5rem; margin-top: 1.5rem; }
    h3 { font-size: 1.25rem; margin-top: 1rem; }
    p { margin: 1rem 0; }
    a { color: #0066cc; }
    img { max-width: 100%; height: auto; }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; font-size: 0.875rem; color: #666; }
  </style>
</head>
<body>
  <article>
    <p>${htmlContent}</p>
  </article>
  <footer>
    Published with <a href="https://lazynext.com">Lazynext</a>
  </footer>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}
