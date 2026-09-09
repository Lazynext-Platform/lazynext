import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { KnowledgeSearch } from './knowledge-search';

// ── Types ──

export type KnowledgeDocumentStatus = 'draft' | 'published' | 'archived';
export type KnowledgeLinkType = 'reference' | 'related' | 'prerequisite' | 'extension';

export interface CreateDocumentInput {
  title: string;
  content?: string;
  workspaceId?: string;
  parentId?: string;
  tags?: string[];
  authorId: string;
  slug?: string;
  status?: KnowledgeDocumentStatus;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  excerpt?: string;
  tags?: string[];
  status?: KnowledgeDocumentStatus;
  workspaceId?: string;
  editorId: string;
  changeSummary?: string;
}

export interface ListOpts {
  workspaceId?: string;
  status?: KnowledgeDocumentStatus;
  tags?: string[];
  parentId?: string | null;
  search?: string;
  limit?: number;
}

export interface AddLinkInput {
  sourceId: string;
  targetId: string;
  label?: string;
  linkType?: KnowledgeLinkType;
  createdBy: string;
}

export interface SearchOpts {
  workspaceId?: string;
  entityType?: string;
  tags?: string[];
  limit?: number;
}

export interface SearchResult {
  id: string;
  entityType: string;
  title: string;
  excerpt: string;
  relevance: number;
  tags: string[];
}

export interface WikiPathNode {
  id: string;
  title: string;
  slug: string;
}

export interface DocumentStats {
  totalDocuments: number;
  byStatus: Record<string, number>;
  byWorkspace: Record<string, number>;
  totalVersions: number;
  totalLinks: number;
  recentActivity: Array<{
    id: string;
    title: string;
    action: string;
    updatedAt: string;
  }>;
}

// ── Helpers ──

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `doc-${Date.now()}`;
}

function computeExcerpt(content: string, maxLen: number = 200): string {
  const plain = content
    .replace(/[#*`>_~\[\]]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen).trim() + '…';
}

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Knowledge Service ──

export const KnowledgeService = {
  /**
   * Create a knowledge document with an initial version.
   */
  async create(organizationId: string, input: CreateDocumentInput) {
    const slug = input.slug?.trim() || slugify(input.title);
    const content = input.content || '';
    const excerpt = computeExcerpt(content);
    const tags = input.tags || [];
    const status = input.status || 'draft';

    const doc = await prisma.knowledgeDocument.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        parentId: input.parentId || null,
        slug,
        title: input.title.slice(0, 300),
        content,
        excerpt,
        tags: JSON.stringify(tags),
        status,
        version: 1,
        authorId: input.authorId,
        lastEditorId: input.authorId,
        publishedAt: status === 'published' ? new Date() : null,
        versions: {
          create: {
            version: 1,
            content,
            excerpt,
            editorId: input.authorId,
            changeSummary: 'Initial version',
          },
        },
      },
      include: { versions: { orderBy: { version: 'desc' }, take: 5 } },
    });

    // Set currentVersionId to the initial version
    const initialVersion = doc.versions[0];
    if (initialVersion) {
      await prisma.knowledgeDocument.update({
        where: { id: doc.id },
        data: { currentVersionId: initialVersion.id },
      });
    }

    // Reindex the new document
    await this.reindexDocument(doc.id).catch(() => null);

    return doc;
  },

  /**
   * Get a single document with versions and links.
   */
  async get(id: string) {
    return safePrisma(() =>
      prisma.knowledgeDocument.findUnique({
        where: { id },
        include: {
          versions: { orderBy: { version: 'desc' }, take: 50 },
          children: { orderBy: { title: 'asc' } },
          parent: { select: { id: true, title: true, slug: true } },
        },
      }),
    null);
  },

  /**
   * List documents with filters.
   */
  async list(organizationId: string, opts?: ListOpts) {
    const where: Record<string, unknown> = { organizationId };

    if (opts?.workspaceId) where.workspaceId = opts.workspaceId;
    if (opts?.status) where.status = opts.status;
    if (opts?.parentId !== undefined) {
      where.parentId = opts.parentId === null ? null : opts.parentId;
    }
    if (opts?.tags && opts.tags.length > 0) {
      // SQLite doesn't have native array filtering; use contains for each tag
      where.OR = opts.tags.map((tag) => ({
        tags: { contains: `"${tag}"` },
      }));
    }
    if (opts?.search) {
      const q = opts.search.trim();
      where.OR = [
        ...(where.OR as unknown[] | undefined) || [],
        { title: { contains: q } },
        { content: { contains: q } },
        { excerpt: { contains: q } },
      ];
    }

    return safePrisma(() =>
      prisma.knowledgeDocument.findMany({
        where: where as never,
        orderBy: { updatedAt: 'desc' },
        take: Math.min(opts?.limit ?? 100, 500),
      }),
    []);
  },

  /**
   * Update a document, creating a new version with the previous content.
   */
  async update(id: string, input: UpdateDocumentInput) {
    const existing = await prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!existing) return null;

    const newVersion = existing.version + 1;
    const data: Record<string, unknown> = {
      version: newVersion,
      lastEditorId: input.editorId,
    };

    if (input.title !== undefined) data.title = input.title.slice(0, 300);
    if (input.content !== undefined) {
      data.content = input.content;
      data.excerpt = computeExcerpt(input.content);
    }
    if (input.excerpt !== undefined) data.excerpt = input.excerpt.slice(0, 300);
    if (input.tags !== undefined) data.tags = JSON.stringify(input.tags);
    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === 'published' && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }
    if (input.workspaceId !== undefined) data.workspaceId = input.workspaceId;

    // Create a version snapshot of the PREVIOUS content
    const versionRecord = await prisma.knowledgeVersion.create({
      data: {
        documentId: id,
        version: newVersion,
        content: input.content !== undefined ? input.content : existing.content,
        excerpt: input.excerpt !== undefined ? input.excerpt : existing.excerpt,
        editorId: input.editorId,
        changeSummary: input.changeSummary || '',
      },
    });

    data.currentVersionId = versionRecord.id;

    const updated = await prisma.knowledgeDocument.update({
      where: { id },
      data,
      include: {
        versions: { orderBy: { version: 'desc' }, take: 10 },
      },
    });

    // Reindex
    await this.reindexDocument(id).catch(() => null);

    return updated;
  },

  /**
   * Delete a document (versions cascade).
   */
  async delete(id: string) {
    // Remove search index entries for this document
    await prisma.knowledgeSearchIndex.deleteMany({
      where: { documentId: id },
    }).catch(() => null);

    return prisma.knowledgeDocument.delete({ where: { id } });
  },

  /**
   * Get version history for a document.
   */
  async getVersions(documentId: string) {
    return safePrisma(() =>
      prisma.knowledgeVersion.findMany({
        where: { documentId },
        orderBy: { version: 'desc' },
        take: 100,
      }),
    []);
  },

  /**
   * Get a specific version of a document.
   */
  async getVersion(documentId: string, version: number) {
    return safePrisma(() =>
      prisma.knowledgeVersion.findFirst({
        where: { documentId, version },
      }),
    null);
  },

  /**
   * Restore a previous version (creates a new version with old content).
   */
  async restoreVersion(documentId: string, version: number, editorId: string) {
    const oldVersion = await this.getVersion(documentId, version);
    if (!oldVersion) return null;

    const doc = await prisma.knowledgeDocument.findUnique({ where: { id: documentId } });
    if (!doc) return null;

    const newVersionNum = doc.version + 1;

    const versionRecord = await prisma.knowledgeVersion.create({
      data: {
        documentId,
        version: newVersionNum,
        content: oldVersion.content,
        excerpt: oldVersion.excerpt,
        editorId,
        changeSummary: `Restored from version ${version}`,
      },
    });

    const updated = await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        version: newVersionNum,
        content: oldVersion.content,
        excerpt: oldVersion.excerpt,
        lastEditorId: editorId,
        currentVersionId: versionRecord.id,
      },
    });

    await this.reindexDocument(documentId).catch(() => null);

    return updated;
  },

  /**
   * Get child documents (wiki tree).
   */
  async getChildren(parentId: string) {
    return safePrisma(() =>
      prisma.knowledgeDocument.findMany({
        where: { parentId },
        orderBy: { title: 'asc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get the full document tree for an organization (optionally filtered by workspace).
   */
  async getTree(organizationId: string, workspaceId?: string) {
    const where: Record<string, unknown> = { organizationId };
    if (workspaceId) where.workspaceId = workspaceId;

    const docs = await safePrisma(() =>
      prisma.knowledgeDocument.findMany({
        where: where as never,
        select: {
          id: true,
          title: true,
          slug: true,
          parentId: true,
          status: true,
          workspaceId: true,
          updatedAt: true,
        },
        orderBy: { title: 'asc' },
        take: 1000,
      }),
    []);

    // Build nested tree structure
    const nodeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    for (const doc of docs) {
      nodeMap.set(doc.id, { ...doc, children: [] });
    }

    for (const doc of docs) {
      const node = nodeMap.get(doc.id)!;
      if (doc.parentId && nodeMap.has(doc.parentId)) {
        nodeMap.get(doc.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  },

  /**
   * Add a knowledge link between two documents.
   */
  async addLink(organizationId: string, input: AddLinkInput) {
    const link = await prisma.knowledgeLink.create({
      data: {
        organizationId,
        sourceId: input.sourceId,
        targetId: input.targetId,
        label: input.label || '',
        linkType: input.linkType || 'reference',
        createdBy: input.createdBy,
      },
    });

    // Update the source document's links JSON array
    const sourceDoc = await prisma.knowledgeDocument.findUnique({
      where: { id: input.sourceId },
      select: { links: true },
    });
    if (sourceDoc) {
      const links = parseJsonArray(sourceDoc.links);
      const existingLinks: Array<{ targetId: string; label: string }> = [];
      try {
        const parsed = JSON.parse(sourceDoc.links);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item === 'object' && item.targetId) {
              existingLinks.push(item);
            }
          }
        }
      } catch {
        // ignore
      }
      existingLinks.push({ targetId: input.targetId, label: input.label || '' });
      await prisma.knowledgeDocument.update({
        where: { id: input.sourceId },
        data: { links: JSON.stringify(existingLinks) },
      });
    }

    return link;
  },

  /**
   * Remove a link by ID.
   */
  async removeLink(id: string) {
    return prisma.knowledgeLink.delete({ where: { id } });
  },

  /**
   * Get all links for a document (outgoing and incoming).
   */
  async getLinks(documentId: string) {
    const [outgoing, incoming] = await Promise.all([
      safePrisma(() =>
        prisma.knowledgeLink.findMany({
          where: { sourceId: documentId },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
      []),
      safePrisma(() =>
        prisma.knowledgeLink.findMany({
          where: { targetId: documentId },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
      []),
    ]);

    return { outgoing, incoming };
  },

  /**
   * Get documents that link TO this document (backlinks).
   */
  async getBacklinks(documentId: string) {
    const links = await safePrisma(() =>
      prisma.knowledgeLink.findMany({
        where: { targetId: documentId },
        include: {
          // We can't directly include the source document since there's no
          // relation, so we fetch links then look up source docs
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);

    if (links.length === 0) return [];

    const sourceIds = links.map((l) => l.sourceId);
    const sourceDocs = await safePrisma(() =>
      prisma.knowledgeDocument.findMany({
        where: { id: { in: sourceIds } },
        select: { id: true, title: true, slug: true, status: true },
      }),
    []);

    return sourceDocs.map((doc) => {
      const link = links.find((l) => l.sourceId === doc.id);
      return {
        ...doc,
        linkId: link?.id,
        linkType: link?.linkType,
        label: link?.label,
      };
    });
  },

  /**
   * Unified search across documents, memories, and research using the
   * KnowledgeSearchIndex table.
   */
  async search(organizationId: string, query: string, opts?: SearchOpts): Promise<SearchResult[]> {
    const q = query.trim();
    if (!q) return [];

    const where: Record<string, unknown> = { organizationId };
    if (opts?.entityType) where.entityType = opts.entityType;

    const indexEntries = await safePrisma(() =>
      prisma.knowledgeSearchIndex.findMany({
        where: where as never,
        take: 5000,
      }),
    []);

    if (indexEntries.length === 0) return [];

    // Convert to SearchIndexEntry format
    const entries = indexEntries.map((entry) => ({
      id: entry.id,
      organizationId: entry.organizationId,
      documentId: entry.documentId,
      memoryId: entry.memoryId,
      researchId: entry.researchId,
      entityType: entry.entityType,
      title: entry.title,
      content: entry.content,
      tags: parseJsonArray(entry.tags),
      keywords: parseJsonArray(entry.keywords),
      relevanceScore: entry.relevanceScore,
    }));

    const results = KnowledgeSearch.search(entries, q, {
      entityType: opts?.entityType,
      tags: opts?.tags,
      limit: opts?.limit,
    });

    return results.map((r) => ({
      id: r.id,
      entityType: r.entityType,
      title: r.title,
      excerpt: r.excerpt,
      relevance: r.relevance,
      tags: r.tags,
    }));
  },

  /**
   * Rebuild the search index from documents, memories, and research.
   */
  async reindex(organizationId: string) {
    // Clear existing index for this org
    await prisma.knowledgeSearchIndex.deleteMany({
      where: { organizationId },
    }).catch(() => null);

    // Index knowledge documents
    const docs = await safePrisma(() =>
      prisma.knowledgeDocument.findMany({
        where: { organizationId },
        take: 5000,
      }),
    []);

    for (const doc of docs) {
      const entry = KnowledgeSearch.buildIndexEntry({
        id: doc.id,
        organizationId: doc.organizationId,
        documentId: doc.id,
        entityType: 'document',
        title: doc.title,
        content: doc.content,
        tags: parseJsonArray(doc.tags),
      });

      await prisma.knowledgeSearchIndex.create({
        data: {
          organizationId,
          documentId: doc.id,
          entityType: 'document',
          title: doc.title,
          content: doc.content,
          tags: JSON.stringify(entry.tags),
          keywords: JSON.stringify(entry.keywords),
          relevanceScore: 0,
        },
      }).catch(() => null);
    }

    // Index memories
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: { organizationId },
        take: 5000,
      }),
    []);

    for (const mem of memories) {
      const entry = KnowledgeSearch.buildIndexEntry({
        id: mem.id,
        organizationId: mem.organizationId,
        memoryId: mem.id,
        entityType: 'memory',
        title: mem.type,
        content: mem.content,
        tags: parseJsonArray(mem.tags),
      });

      await prisma.knowledgeSearchIndex.create({
        data: {
          organizationId,
          memoryId: mem.id,
          entityType: 'memory',
          title: mem.type,
          content: mem.content,
          tags: JSON.stringify(entry.tags),
          keywords: JSON.stringify(entry.keywords),
          relevanceScore: 0,
        },
      }).catch(() => null);
    }

    // Index research sessions
    const research = await safePrisma(() =>
      prisma.researchSession.findMany({
        where: { organizationId },
        take: 5000,
      }),
    []);

    for (const res of research) {
      const entry = KnowledgeSearch.buildIndexEntry({
        id: res.id,
        organizationId: res.organizationId,
        researchId: res.id,
        entityType: 'research',
        title: res.query,
        content: res.summary || res.findings,
      });

      await prisma.knowledgeSearchIndex.create({
        data: {
          organizationId,
          researchId: res.id,
          entityType: 'research',
          title: res.query,
          content: res.summary || res.findings,
          tags: JSON.stringify(entry.tags),
          keywords: JSON.stringify(entry.keywords),
          relevanceScore: 0,
        },
      }).catch(() => null);
    }

    return {
      documents: docs.length,
      memories: memories.length,
      research: research.length,
    };
  },

  /**
   * Reindex a single document.
   */
  async reindexDocument(documentId: string) {
    const doc = await prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) return null;

    // Remove existing index entry for this document
    await prisma.knowledgeSearchIndex.deleteMany({
      where: { documentId },
    }).catch(() => null);

    const entry = KnowledgeSearch.buildIndexEntry({
      id: doc.id,
      organizationId: doc.organizationId,
      documentId: doc.id,
      entityType: 'document',
      title: doc.title,
      content: doc.content,
      tags: parseJsonArray(doc.tags),
    });

    return prisma.knowledgeSearchIndex.create({
      data: {
        organizationId: doc.organizationId,
        documentId: doc.id,
        entityType: 'document',
        title: doc.title,
        content: doc.content,
        tags: JSON.stringify(entry.tags),
        keywords: JSON.stringify(entry.keywords),
        relevanceScore: 0,
      },
    });
  },

  /**
   * Get all unique tags with counts.
   */
  async getTags(organizationId: string) {
    const docs = await safePrisma(() =>
      prisma.knowledgeDocument.findMany({
        where: { organizationId },
        select: { tags: true },
        take: 5000,
      }),
    []);

    const tagCounts = new Map<string, number>();
    for (const doc of docs) {
      const tags = parseJsonArray(doc.tags);
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * Get stats: total documents, by status, by workspace, total versions,
   * total links, recent activity.
   */
  async getStats(organizationId: string): Promise<DocumentStats> {
    const [docs, versions, links, recentDocs] = await Promise.all([
      safePrisma(() =>
        prisma.knowledgeDocument.findMany({
          where: { organizationId },
          select: { id: true, status: true, workspaceId: true, updatedAt: true, title: true },
          take: 10000,
        }),
      []),
      safePrisma(() =>
        prisma.knowledgeVersion.count({
          where: { document: { organizationId } },
        }),
      0),
      safePrisma(() =>
        prisma.knowledgeLink.count({
          where: { organizationId },
        }),
      0),
      safePrisma(() =>
        prisma.knowledgeDocument.findMany({
          where: { organizationId },
          orderBy: { updatedAt: 'desc' },
          take: 10,
          select: { id: true, title: true, updatedAt: true, status: true },
        }),
      []),
    ]);

    const byStatus: Record<string, number> = {};
    const byWorkspace: Record<string, number> = {};

    for (const doc of docs) {
      byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
      const ws = doc.workspaceId || 'unassigned';
      byWorkspace[ws] = (byWorkspace[ws] || 0) + 1;
    }

    return {
      totalDocuments: docs.length,
      byStatus,
      byWorkspace,
      totalVersions: versions,
      totalLinks: links,
      recentActivity: recentDocs.map((d) => ({
        id: d.id,
        title: d.title,
        action: d.status,
        updatedAt: d.updatedAt.toISOString(),
      })),
    };
  },

  /**
   * Get the path from root to this document (breadcrumb).
   */
  async getWikiPath(documentId: string): Promise<WikiPathNode[]> {
    const path: WikiPathNode[] = [];
    let currentId: string | null = documentId;

    // Guard against cycles
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const doc = await safePrisma(() =>
        prisma.knowledgeDocument.findUnique({
          where: { id: currentId! },
          select: { id: true, title: true, slug: true, parentId: true },
        }),
      null);

      if (!doc) break;

      path.unshift({ id: doc.id, title: doc.title, slug: doc.slug });
      currentId = doc.parentId;
    }

    return path;
  },

  /**
   * Move a document to a new parent.
   */
  async moveDocument(documentId: string, newParentId: string | null) {
    // Prevent making a document its own parent (or descendant)
    if (newParentId) {
      if (newParentId === documentId) {
        throw new Error('Cannot make a document its own parent');
      }
      // Check that newParentId is not a descendant of documentId
      const path = await this.getWikiPath(newParentId);
      if (path.some((node) => node.id === documentId)) {
        throw new Error('Cannot move a document under its own descendant');
      }
    }

    return prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { parentId: newParentId },
    });
  },
};

// ── Tree node type ──

interface TreeNode {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  status: string;
  workspaceId: string | null;
  updatedAt: Date;
  children: TreeNode[];
}
