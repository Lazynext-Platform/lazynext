import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface TestimonialData {
  customerName: string;
  customerCompany?: string;
  customerTitle?: string;
  content: string;
  rating?: number;
  source?: string;
  approved: boolean;
  rejectedReason?: string;
  tags?: string[];
}

export interface TestimonialStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  avgRating: number;
}

export interface TestimonialRequest {
  subject: string;
  body: string;
}

// ── Helpers ──

function safeParseArray(s: string): string[] {
  try {
    const a = JSON.parse(s);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function parseTestimonial(mem: {
  id: string;
  content: string;
  tags: string;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
  organizationId: string;
  createdBy: string;
}): TestimonialData & { id: string; workspaceId: string; organizationId: string; createdBy: string; tags: string[]; createdAt: Date; updatedAt: Date } {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(mem.content);
  } catch {
    data = {};
  }
  return {
    ...data,
    id: mem.id,
    workspaceId: mem.workspaceId,
    organizationId: mem.organizationId,
    createdBy: mem.createdBy,
    tags: safeParseArray(mem.tags),
    createdAt: mem.createdAt,
    updatedAt: mem.updatedAt,
  } as TestimonialData & { id: string; workspaceId: string; organizationId: string; createdBy: string; tags: string[]; createdAt: Date; updatedAt: Date };
}

// ── Testimonial Service ──

export const TestimonialService = {
  /**
   * Create a new testimonial stored as a Memory record.
   */
  async create(organizationId: string, input: {
    customerName: string;
    customerCompany?: string;
    customerTitle?: string;
    content: string;
    rating?: number;
    source?: string;
    approved?: boolean;
    tags?: string[];
    workspaceId?: string;
    createdBy?: string;
  }) {
    const content = JSON.stringify({
      customerName: input.customerName.slice(0, 300),
      customerCompany: input.customerCompany || '',
      customerTitle: input.customerTitle || '',
      content: input.content.slice(0, 8000),
      rating: input.rating ?? null,
      source: input.source || 'direct',
      approved: input.approved ?? false,
      rejectedReason: null,
      tags: input.tags || [],
    });

    return prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'testimonial',
        content: content.slice(0, 10000),
        source: 'user',
        sourceId: input.createdBy || null,
        confidence: 0.8,
        owner: input.createdBy || null,
        lifecycle: 'permanent',
        tags: JSON.stringify(input.tags || ['testimonial']),
        createdBy: input.createdBy || 'system',
      },
    });
  },

  /**
   * Get a single testimonial by ID.
   */
  async get(id: string) {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!mem || mem.type !== 'testimonial') return null;
    return parseTestimonial(mem);
  },

  /**
   * List testimonials with filters.
   */
  async list(organizationId: string, opts?: {
    approved?: boolean;
    rating?: number;
    tags?: string[];
    search?: string;
  }) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: { organizationId, type: 'testimonial' },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      [],
    );

    let results = memories.map(parseTestimonial);

    if (opts?.approved !== undefined) {
      results = results.filter((t) => t.approved === opts.approved);
    }
    if (opts?.rating !== undefined) {
      results = results.filter((t) => t.rating === opts.rating);
    }
    if (opts?.tags && opts.tags.length > 0) {
      results = results.filter((t) =>
        opts.tags!.some((tag) => t.tags.includes(tag)),
      );
    }
    if (opts?.search) {
      const searchLower = opts.search.toLowerCase();
      results = results.filter((t) =>
        t.content.toLowerCase().includes(searchLower) ||
        t.customerName.toLowerCase().includes(searchLower) ||
        (t.customerCompany || '').toLowerCase().includes(searchLower),
      );
    }
    return results;
  },

  /**
   * Update a testimonial.
   */
  async update(id: string, input: {
    customerName?: string;
    customerCompany?: string;
    customerTitle?: string;
    content?: string;
    rating?: number;
    tags?: string[];
  }) {
    const existing = await this.get(id);
    if (!existing) throw new Error('Testimonial not found');

    const merged: TestimonialData = {
      customerName: existing.customerName,
      customerCompany: existing.customerCompany,
      customerTitle: existing.customerTitle,
      content: existing.content,
      rating: existing.rating ?? undefined,
      source: existing.source,
      approved: existing.approved,
      rejectedReason: existing.rejectedReason,
      tags: existing.tags,
    };

    if (input.customerName !== undefined) merged.customerName = input.customerName.slice(0, 300);
    if (input.customerCompany !== undefined) merged.customerCompany = input.customerCompany;
    if (input.customerTitle !== undefined) merged.customerTitle = input.customerTitle;
    if (input.content !== undefined) merged.content = input.content.slice(0, 8000);
    if (input.rating !== undefined) merged.rating = input.rating;
    if (input.tags !== undefined) merged.tags = input.tags;

    const content = JSON.stringify(merged);
    return prisma.memory.update({
      where: { id },
      data: {
        content: content.slice(0, 10000),
        tags: JSON.stringify(merged.tags || []),
      },
    });
  },

  /**
   * Delete a testimonial.
   */
  async delete(id: string) {
    return prisma.memory.delete({ where: { id } });
  },

  /**
   * Approve a testimonial for public display.
   */
  async approve(id: string) {
    const existing = await this.get(id);
    if (!existing) throw new Error('Testimonial not found');

    const merged: TestimonialData = {
      customerName: existing.customerName,
      customerCompany: existing.customerCompany,
      customerTitle: existing.customerTitle,
      content: existing.content,
      rating: existing.rating ?? undefined,
      source: existing.source,
      approved: true,
      rejectedReason: undefined,
      tags: existing.tags,
    };

    const content = JSON.stringify(merged);
    return prisma.memory.update({
      where: { id },
      data: {
        content: content.slice(0, 10000),
      },
    });
  },

  /**
   * Reject a testimonial.
   */
  async reject(id: string, reason?: string) {
    const existing = await this.get(id);
    if (!existing) throw new Error('Testimonial not found');

    const merged: TestimonialData = {
      customerName: existing.customerName,
      customerCompany: existing.customerCompany,
      customerTitle: existing.customerTitle,
      content: existing.content,
      rating: existing.rating ?? undefined,
      source: existing.source,
      approved: false,
      rejectedReason: reason || '',
      tags: existing.tags,
    };

    const content = JSON.stringify(merged);
    return prisma.memory.update({
      where: { id },
      data: {
        content: content.slice(0, 10000),
      },
    });
  },

  /**
   * Get approved testimonials for public display.
   */
  async getApproved(organizationId: string, opts?: {
    rating?: number;
    tags?: string[];
    search?: string;
    limit?: number;
  }) {
    const results = await this.list(organizationId, {
      approved: true,
      rating: opts?.rating,
      tags: opts?.tags,
      search: opts?.search,
    });
    return opts?.limit ? results.slice(0, opts.limit) : results;
  },

  /**
   * Generate a testimonial request email template.
   */
  async requestTestimonial(organizationId: string, input: {
    customerName: string;
    customerEmail: string;
    productName?: string;
  }): Promise<TestimonialRequest> {
    const product = input.productName || 'our product';
    const subject = `We'd love your feedback on ${product}!`;

    const body = `Hi ${input.customerName},

Thank you for being a valued customer! We hope you've been enjoying ${product}.

We're reaching out because your experience matters to us. If you've had a positive experience with ${product}, we would be incredibly grateful if you could share a brief testimonial that we could feature on our website and marketing materials.

Your words can help other customers understand the value of ${product}, and we'd be honored to showcase your feedback.

To share your testimonial, simply reply to this email with:
- A short quote about your experience
- Your name and company (for attribution)
- A rating from 1-5 stars (optional)

Thank you for your time and support!

Best regards,
The Team`;

    return { subject, body };
  },

  /**
   * Get testimonial stats for an organization.
   */
  async getStats(organizationId: string): Promise<TestimonialStats> {
    const all = await this.list(organizationId);

    let approved = 0;
    let pending = 0;
    let rejected = 0;
    let totalRating = 0;
    let ratingCount = 0;

    for (const t of all) {
      if (t.approved) {
        approved++;
      } else if (t.rejectedReason) {
        rejected++;
      } else {
        pending++;
      }
      if (t.rating !== undefined && t.rating !== null) {
        totalRating += t.rating;
        ratingCount++;
      }
    }

    const avgRating = ratingCount > 0
      ? Math.round((totalRating / ratingCount) * 10) / 10
      : 0;

    return {
      total: all.length,
      approved,
      pending,
      rejected,
      avgRating,
    };
  },
};
