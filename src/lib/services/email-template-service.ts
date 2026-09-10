import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface TemplateData {
  name: string;
  category: string;
  subject: string;
  preheader?: string;
  bodyHtml: string;
  bodyText?: string;
  variables?: string[];
  thumbnail?: string;
  isDefault?: boolean;
  usageCount?: number;
}

export interface TemplateStats {
  total: number;
  byCategory: Record<string, number>;
  defaults: number;
  totalUsage: number;
}

// ── Helpers ──

function parseTemplate(mem: {
  id: string;
  content: string;
  tags: string;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
  organizationId: string;
  createdBy: string;
}): Record<string, unknown> & { id: string } {
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(mem.content); } catch { data = {}; }
  return {
    ...data,
    id: mem.id,
    workspaceId: mem.workspaceId,
    organizationId: mem.organizationId,
    createdBy: mem.createdBy,
    tags: safeParseArray(mem.tags),
    createdAt: mem.createdAt,
    updatedAt: mem.updatedAt,
  };
}

function safeParseArray(s: string): string[] {
  try {
    const a = JSON.parse(s);
    return Array.isArray(a) ? a : [];
  } catch { return []; }
}

// ── Default Templates ──

const DEFAULT_TEMPLATES: TemplateData[] = [
  {
    name: 'Welcome Email',
    category: 'welcome',
    subject: 'Welcome to {{company_name}}, {{first_name}}!',
    preheader: 'Thanks for joining us',
    bodyHtml: '<h1>Welcome, {{first_name}}!</h1><p>Thanks for joining {{company_name}}. We\'re excited to have you.</p><p>Get started: {{cta_url}}</p>',
    bodyText: 'Welcome, {{first_name}}!\n\nThanks for joining {{company_name}}. Get started: {{cta_url}}',
    variables: ['first_name', 'company_name', 'cta_url'],
    isDefault: true,
  },
  {
    name: 'Monthly Newsletter',
    category: 'newsletter',
    subject: '{{month}} Newsletter — {{company_name}}',
    preheader: 'Your monthly update',
    bodyHtml: '<h1>{{company_name}} Newsletter</h1><h2>{{headline}}</h2><p>{{summary}}</p><a href="{{cta_url}}">Read more</a>',
    bodyText: '{{company_name}} Newsletter\n\n{{headline}}\n{{summary}}\nRead more: {{cta_url}}',
    variables: ['company_name', 'month', 'headline', 'summary', 'cta_url'],
    isDefault: true,
  },
  {
    name: 'Promotional Offer',
    category: 'promotional',
    subject: '{{discount}}% off — Limited time!',
    preheader: 'Don\'t miss out',
    bodyHtml: '<h1>Special Offer</h1><p>Get {{discount}}% off {{product_name}}. Use code {{promo_code}}.</p><a href="{{cta_url}}">Shop now</a>',
    bodyText: 'Special Offer\nGet {{discount}}% off {{product_name}}. Use code {{promo_code}}.\nShop now: {{cta_url}}',
    variables: ['discount', 'product_name', 'promo_code', 'cta_url'],
    isDefault: true,
  },
  {
    name: 'Transactional Receipt',
    category: 'transactional',
    subject: 'Your receipt for {{order_id}}',
    preheader: 'Order confirmation',
    bodyHtml: '<h1>Order Confirmed</h1><p>Order: {{order_id}}</p><p>Total: {{amount}}</p><p>Thanks, {{first_name}}!</p>',
    bodyText: 'Order Confirmed\nOrder: {{order_id}}\nTotal: {{amount}}\nThanks, {{first_name}}!',
    variables: ['order_id', 'amount', 'first_name'],
    isDefault: true,
  },
];

// ── Email Template Service ──

export const EmailTemplateService = {
  /**
   * Create a new email template stored as a Memory record.
   */
  async create(input: {
    workspaceId: string;
    organizationId: string;
    createdBy: string;
    data: TemplateData;
  }) {
    const content = JSON.stringify({
      name: input.data.name,
      category: input.data.category || 'general',
      subject: input.data.subject,
      preheader: input.data.preheader || '',
      bodyHtml: input.data.bodyHtml,
      bodyText: input.data.bodyText || '',
      variables: input.data.variables || [],
      thumbnail: input.data.thumbnail || '',
      isDefault: input.data.isDefault || false,
      usageCount: input.data.usageCount || 0,
    });
    return prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'email_template',
        content: content.slice(0, 10000),
        source: 'user',
        sourceId: input.createdBy,
        confidence: 0.9,
        owner: input.createdBy,
        lifecycle: 'long',
        tags: JSON.stringify(['email_template', input.data.category || 'general']),
        createdBy: input.createdBy,
      },
    });
  },

  /**
   * Get a single template by ID.
   */
  async get(id: string) {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null);
    if (!mem || mem.type !== 'email_template') return null;
    return parseTemplate(mem);
  },

  /**
   * List templates with optional filters.
   */
  async list(workspaceId: string, filters?: {
    category?: string;
    search?: string;
  }) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'email_template',
          ...(filters?.category && {
            tags: { contains: `"${filters.category}"` },
          }),
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    []);

    let templates = memories.map(parseTemplate);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      templates = templates.filter((t) =>
        String(t.name || '').toLowerCase().includes(q) ||
        String(t.subject || '').toLowerCase().includes(q));
    }
    return templates;
  },

  /**
   * Update a template's data fields.
   */
  async update(id: string, data: Partial<TemplateData>) {
    const existing = await this.get(id);
    if (!existing) throw new Error('Template not found');

    const merged: TemplateData = {
      name: String(existing.name || ''),
      category: String(existing.category || 'general'),
      subject: String(existing.subject || ''),
      preheader: existing.preheader as string | undefined,
      bodyHtml: String(existing.bodyHtml || ''),
      bodyText: existing.bodyText as string | undefined,
      variables: existing.variables as string[] | undefined,
      thumbnail: existing.thumbnail as string | undefined,
      isDefault: existing.isDefault as boolean | undefined,
      usageCount: (existing.usageCount as number) || 0,
    };

    if (data.name !== undefined) merged.name = data.name;
    if (data.category !== undefined) merged.category = data.category;
    if (data.subject !== undefined) merged.subject = data.subject;
    if (data.preheader !== undefined) merged.preheader = data.preheader;
    if (data.bodyHtml !== undefined) merged.bodyHtml = data.bodyHtml;
    if (data.bodyText !== undefined) merged.bodyText = data.bodyText;
    if (data.variables !== undefined) merged.variables = data.variables;
    if (data.thumbnail !== undefined) merged.thumbnail = data.thumbnail;
    if (data.isDefault !== undefined) merged.isDefault = data.isDefault;
    if (data.usageCount !== undefined) merged.usageCount = data.usageCount;

    const content = JSON.stringify({
      name: merged.name,
      category: merged.category,
      subject: merged.subject,
      preheader: merged.preheader || '',
      bodyHtml: merged.bodyHtml,
      bodyText: merged.bodyText || '',
      variables: merged.variables || [],
      thumbnail: merged.thumbnail || '',
      isDefault: merged.isDefault || false,
      usageCount: merged.usageCount || 0,
    });

    return prisma.memory.update({
      where: { id },
      data: {
        content: content.slice(0, 10000),
        tags: JSON.stringify(['email_template', merged.category]),
      },
    });
  },

  /**
   * Delete a template.
   */
  async delete(id: string) {
    return prisma.memory.delete({ where: { id } });
  },

  /**
   * Render a template by replacing {{variable}} placeholders with values.
   */
  async render(id: string, variables: Record<string, string>): Promise<{
    subject: string;
    preheader: string;
    bodyHtml: string;
    bodyText: string;
  }> {
    const template = await this.get(id);
    if (!template) throw new Error('Template not found');

    const replace = (text: string): string =>
      text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '');

    // Increment usage count
    const prevUsage = (template.usageCount as number) || 0;
    await this.update(id, { usageCount: prevUsage + 1 }).catch(() => null);

    return {
      subject: replace(String(template.subject || '')),
      preheader: replace(String(template.preheader || '')),
      bodyHtml: replace(String(template.bodyHtml || '')),
      bodyText: replace(String(template.bodyText || '')),
    };
  },

  /**
   * Get all distinct template categories for a workspace.
   */
  async getCategories(workspaceId: string): Promise<string[]> {
    const templates = await this.list(workspaceId);
    const cats = new Set<string>();
    for (const t of templates) {
      cats.add(String(t.category || 'general'));
    }
    return Array.from(cats).sort();
  },

  /**
   * Get or seed default templates (welcome, newsletter, promotional, transactional).
   * Returns the default templates for the workspace, creating them if none exist.
   */
  async getDefaults(workspaceId: string, organizationId: string, createdBy: string): Promise<unknown[]> {
    const existing = await this.list(workspaceId);
    const defaultsExisting = existing.filter((t) => t.isDefault);
    if (defaultsExisting.length > 0) return defaultsExisting;

    // Seed defaults
    const created: unknown[] = [];
    for (const def of DEFAULT_TEMPLATES) {
      const t = await this.create({
        workspaceId,
        organizationId,
        createdBy,
        data: def,
      });
      created.push(t);
    }
    return created;
  },

  /**
   * Get aggregate stats for templates.
   */
  async getStats(workspaceId: string): Promise<TemplateStats> {
    const templates = await this.list(workspaceId);
    const byCategory: Record<string, number> = {};
    let defaults = 0, totalUsage = 0;

    for (const t of templates) {
      const cat = String(t.category || 'general');
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      if (t.isDefault) defaults += 1;
      totalUsage += (t.usageCount as number) || 0;
    }

    return {
      total: templates.length,
      byCategory,
      defaults,
      totalUsage,
    };
  },
};
