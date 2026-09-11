import { NextRequest, NextResponse } from 'next/server';
import { PublicSitesService } from '@/lib/services/public-sites';

/**
 * GET /sites/[slug]
 * Public route — serves the index page for a company's public website.
 * Lists all published pages.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Check for wildcard subdomain routing
  const host = req.headers.get('host') || '';
  const wildcardSlug = PublicSitesService.resolveOrgSlugFromHost(host);
  const orgSlug = wildcardSlug || slug;

  // List all published pages
  const pages = await PublicSitesService.listPublicPages(orgSlug);

  if (pages.length === 0) {
    return NextResponse.json({ error: 'no_published_pages' }, { status: 404 });
  }

  // If there's an index page, serve it
  const indexPage = pages.find(p => p.publishSlug === 'index');
  if (indexPage) {
    const html = renderPage(indexPage);
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Otherwise, list all pages
  const listHtml = renderList(orgSlug, pages);
  return new NextResponse(listHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderPage(page: { title: string; content: string }): string {
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
    p { margin: 1rem 0; }
    a { color: #0066cc; }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; font-size: 0.875rem; color: #666; }
  </style>
</head>
<body>
  <article>
    <p>${htmlContent}</p>
  </article>
  <footer>Published with <a href="https://lazynext.com">Lazynext</a></footer>
</body>
</html>`;
}

function renderList(orgSlug: string, pages: Array<{ title: string; publishSlug: string }>): string {
  const links = pages.map(p => `<li><a href="/sites/${orgSlug}/${p.publishSlug}">${escapeHtml(p.title)}</a></li>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Published Pages</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem 1rem; line-height: 1.6; }
    ul { padding-left: 1.5rem; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>Published Pages</h1>
  <ul>${links}</ul>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}
