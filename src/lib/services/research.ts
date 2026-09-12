import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ResearchStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type CitationCredibility = 'low' | 'medium' | 'high';

// ── Research Service ──

export const ResearchService = {
  /**
   * List research sessions for a workspace.
   */
  async listSessions(workspaceId: string) {
    return safePrisma(() =>
      prisma.researchSession.findMany({
        where: { workspaceId },
        include: {
          _count: { select: { citations: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get a single research session with its citations.
   */
  async getSession(id: string) {
    return safePrisma(() =>
      prisma.researchSession.findUnique({
        where: { id },
        include: {
          citations: { orderBy: { accessedAt: 'desc' }, take: 100 },
        },
      }),
    null);
  },

  /**
   * Create a new research session.
   */
  async createSession(workspaceId: string, input: {
    organizationId: string;
    query: string;
    ownerId?: string;
    agentRunId?: string;
  }) {
    return prisma.researchSession.create({
      data: {
        organizationId: input.organizationId,
        workspaceId,
        query: input.query.slice(0, 2000),
        status: 'pending',
        ownerId: input.ownerId || null,
        agentRunId: input.agentRunId || null,
      },
    });
  },

  /**
   * Update a research session (findings, summary, status).
   */
  async updateSession(id: string, input: {
    findings?: Record<string, unknown>;
    summary?: string;
    status?: ResearchStatus;
    agentRunId?: string;
  }) {
    const data: Record<string, unknown> = {};
    if (input.findings !== undefined) data.findings = JSON.stringify(input.findings);
    if (input.summary !== undefined) data.summary = input.summary.slice(0, 10000);
    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === 'running' && !input.findings) {
        data.startedAt = new Date();
      }
    }
    if (input.agentRunId !== undefined) data.agentRunId = input.agentRunId;

    return prisma.researchSession.update({ where: { id }, data });
  },

  /**
   * Add a citation to a research session.
   */
  async addCitation(sessionId: string, input: {
    url: string;
    title?: string;
    snippet?: string;
    publishedAt?: Date;
    credibility?: CitationCredibility;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.citation.create({
      data: {
        researchSessionId: sessionId,
        url: input.url.slice(0, 2000),
        title: input.title?.slice(0, 500) || null,
        snippet: input.snippet?.slice(0, 5000) || null,
        publishedAt: input.publishedAt || null,
        credibility: input.credibility || 'medium',
        metadata: JSON.stringify(input.metadata || {}),
      },
    });
  },

  /**
   * List citations for a research session.
   */
  async listCitations(sessionId: string) {
    return safePrisma(() =>
      prisma.citation.findMany({
        where: { researchSessionId: sessionId },
        orderBy: { accessedAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Delete a single citation from a research session.
   */
  async deleteCitation(sessionId: string, citationId: string) {
    return prisma.citation.deleteMany({
      where: { id: citationId, researchSessionId: sessionId },
    });
  },

  /**
   * Delete a research session.
   */
  async deleteSession(id: string) {
    return prisma.researchSession.delete({ where: { id } });
  },

  /**
   * Mark a research session as completed with summary and findings.
   */
  async completeSession(id: string, summary: string, findings: Record<string, unknown>) {
    return prisma.researchSession.update({
      where: { id },
      data: {
        status: 'completed',
        summary: summary.slice(0, 10000),
        findings: JSON.stringify(findings),
        completedAt: new Date(),
      },
    });
  },
};
