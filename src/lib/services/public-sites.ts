/**
 * Public Sites Service — per-company public website publishing.
 *
 * Inspired by openpolsia's per-company public websites, re-implemented natively
 * for Lazynext's Prisma + D1/SQLite stack.
 *
 * Publishes documents publicly at `/sites/{org-slug}/{doc-slug}` and
 * (feature-flagged) at `{org-slug}.lazynext.com/{doc-slug}`.
 *
 * Publishing is gated through the design-quality scanner (kill-ai-slop)
 * to prevent AI-slop pages from going live.
 *
 * @see docs/research/external-reference-architectures.md
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { scanMarkup } from '@/lib/quality/design-rules';
import { EventService } from '@/lib/services/event';

// ── Types ──

export interface PublishResult {
  success: boolean;
  documentId: string;
  publishSlug: string;
  publicUrl: string;
  designScanPassed: boolean;
  designScanHits: number;
  error?: string;
}

export interface PublicSitePage {
  documentId: string;
  title: string;
  content: string;
  publishSlug: string;
  publishedAt: Date;
  organizationSlug: string;
}

// ── Public Sites Service ──

export const PublicSitesService = {
  /**
   * Publish a document to the public website.
   * Runs the design-quality scanner first — pages with too many slop tells
   * are rejected unless `force` is true.
   */
  async publishDocument(input: {
    documentId: string;
    publishSlug?: string;
    force?: boolean;
    userId: string;
  }): Promise<PublishResult> {
    // 1. Fetch the document
    const doc = await safePrisma(() =>
      prisma.document.findUnique({
        where: { id: input.documentId },
        include: { workspace: { include: { organization: { select: { id: true, slug: true } } } } },
      }),
    null);

    if (!doc || doc.deletedAt) {
      return { success: false, documentId: input.documentId, publishSlug: '', publicUrl: '', designScanPassed: false, designScanHits: 0, error: 'document_not_found' };
    }

    const orgSlug = doc.workspace?.organization?.slug || '';
    if (!orgSlug) {
      return { success: false, documentId: input.documentId, publishSlug: '', publicUrl: '', designScanPassed: false, designScanHits: 0, error: 'no_organization' };
    }

    // 2. Generate publish slug from title if not provided
    const publishSlug = input.publishSlug || slugify(doc.title);

    // 3. Run design-quality scanner
    const scanResult = scanMarkup(doc.content, doc.title);
    const designScanPassed = scanResult.totalHits === 0 || input.force === true;

    if (!designScanPassed) {
      return {
        success: false,
        documentId: input.documentId,
        publishSlug,
        publicUrl: '',
        designScanPassed: false,
        designScanHits: scanResult.totalHits,
        error: `design_scan_failed: ${scanResult.totalHits} slop tells detected. Use force=true to override.`,
      };
    }

    // 4. Publish the document
    await prisma.document.update({
      where: { id: input.documentId },
      data: {
        published: true,
        publishedAt: new Date(),
        publishSlug,
      },
    }).catch(() => {});

    // 5. Emit event
    await EventService.emit({
      workspaceId: doc.workspaceId,
      organizationId: doc.workspace?.organization?.id,
      type: 'site.document.published',
      actor: input.userId,
      actorType: 'user',
      resourceType: 'document',
      resourceId: input.documentId,
      metadata: { publishSlug, orgSlug, designScanHits: scanResult.totalHits, forced: input.force === true },
      source: 'public-sites',
    }).catch(() => {});

    return {
      success: true,
      documentId: input.documentId,
      publishSlug,
      publicUrl: `/sites/${orgSlug}/${publishSlug}`,
      designScanPassed: true,
      designScanHits: scanResult.totalHits,
    };
  },

  /**
   * Unpublish a document.
   */
  async unpublishDocument(documentId: string): Promise<boolean> {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        published: false,
        publishedAt: null,
        publishSlug: null,
      },
    }).catch(() => {});
    return true;
  },

  /**
   * Get a public page by organization slug and publish slug.
   * This is the read path for the public website.
   */
  async getPublicPage(orgSlug: string, publishSlug: string): Promise<PublicSitePage | null> {
    const doc = await safePrisma(() =>
      prisma.document.findFirst({
        where: {
          published: true,
          publishSlug,
          deletedAt: null,
          workspace: {
            organization: { slug: orgSlug },
          },
        },
        include: {
          workspace: { include: { organization: { select: { slug: true } } } },
        },
      }),
    null);

    if (!doc) return null;

    return {
      documentId: doc.id,
      title: doc.title,
      content: doc.content,
      publishSlug: doc.publishSlug || '',
      publishedAt: doc.publishedAt || new Date(),
      organizationSlug: doc.workspace?.organization?.slug || orgSlug,
    };
  },

  /**
   * List all published pages for an organization.
   */
  async listPublicPages(orgSlug: string): Promise<PublicSitePage[]> {
    const docs = await safePrisma(() =>
      prisma.document.findMany({
        where: {
          published: true,
          deletedAt: null,
          workspace: {
            organization: { slug: orgSlug },
          },
        },
        include: {
          workspace: { include: { organization: { select: { slug: true } } } },
        },
        orderBy: { publishedAt: 'desc' },
      }),
    []);

    return docs.map(doc => ({
      documentId: doc.id,
      title: doc.title,
      content: doc.content,
      publishSlug: doc.publishSlug || '',
      publishedAt: doc.publishedAt || new Date(),
      organizationSlug: doc.workspace?.organization?.slug || orgSlug,
    }));
  },

  /**
   * Resolve an organization slug from a hostname.
   * Supports `{slug}.lazynext.com` wildcard routing.
   * Returns null if the hostname doesn't match the wildcard pattern.
   */
  resolveOrgSlugFromHost(hostname: string): string | null {
    // Feature flag: wildcard subdomain routing
    if (process.env.SITES_WILDCARD_ENABLED !== 'true') return null;

    const baseDomain = process.env.SITES_BASE_DOMAIN || 'lazynext.com';
    const escapedDomain = baseDomain.replace(/\\/g, '\\\\').replace(/\./g, '\\.');
    const pattern = new RegExp(`^(.+)\\.${escapedDomain}$`);
    const match = hostname.match(pattern);
    if (!match) return null;
    const slug = match[1];
    // Exclude www and other reserved subdomains
    if (['www', 'api', 'mail', 'admin', 'app'].includes(slug)) return null;
    return slug;
  },
};

// ── Helpers ──

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'untitled';
}
