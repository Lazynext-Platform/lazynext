import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Meeting Intelligence ──

export const MeetingService = {
  async create(organizationId: string, input: {
    title: string;
    description?: string;
    type?: string;
    scheduledAt: Date;
    duration?: number;
    location?: string;
    organizerId: string;
    attendeeIds?: string[];
    agenda?: string[];
    workspaceId?: string;
    tags?: string[];
  }) {
    return prisma.meeting.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        title: input.title.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        type: input.type || 'general',
        status: 'scheduled',
        scheduledAt: input.scheduledAt,
        duration: clamp(input.duration ?? 60, 1, 1440),
        location: input.location?.slice(0, 500) || '',
        organizerId: input.organizerId,
        attendeeIds: JSON.stringify(input.attendeeIds || []),
        agenda: JSON.stringify(input.agenda || []),
        tags: JSON.stringify(input.tags || []),
      },
    });
  },

  async get(id: string) {
    const meeting = await safePrisma(() =>
      prisma.meeting.findUnique({ where: { id } }),
    null);
    if (!meeting) return null;
    return parseMeetingJson(meeting);
  },

  async list(organizationId: string, opts?: {
    type?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
    organizerId?: string;
    search?: string;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.type) where.type = opts.type;
    if (opts?.status) where.status = opts.status;
    if (opts?.organizerId) where.organizerId = opts.organizerId;
    if (opts?.dateRange) {
      where.scheduledAt = { gte: opts.dateRange.start, lte: opts.dateRange.end };
    }
    if (opts?.search) {
      where.OR = [
        { title: { contains: opts.search } },
        { description: { contains: opts.search } },
      ];
    }
    const meetings = await safePrisma(() =>
      prisma.meeting.findMany({
        where,
        orderBy: [{ scheduledAt: 'desc' }],
        take: 200,
      }),
    []);
    return meetings.map(parseMeetingJson);
  },

  async update(id: string, input: {
    title?: string;
    description?: string;
    type?: string;
    status?: string;
    scheduledAt?: Date;
    duration?: number;
    location?: string;
    organizerId?: string;
    attendeeIds?: string[];
    agenda?: string[];
    tags?: string[];
  }) {
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title.slice(0, 300);
    if (input.description !== undefined) updateData.description = input.description.slice(0, 5000);
    if (input.type !== undefined) updateData.type = input.type;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.scheduledAt !== undefined) updateData.scheduledAt = input.scheduledAt;
    if (input.duration !== undefined) updateData.duration = clamp(input.duration, 1, 1440);
    if (input.location !== undefined) updateData.location = input.location.slice(0, 500);
    if (input.organizerId !== undefined) updateData.organizerId = input.organizerId;
    if (input.attendeeIds !== undefined) updateData.attendeeIds = JSON.stringify(input.attendeeIds);
    if (input.agenda !== undefined) updateData.agenda = JSON.stringify(input.agenda);
    if (input.tags !== undefined) updateData.tags = JSON.stringify(input.tags);
    return prisma.meeting.update({ where: { id }, data: updateData });
  },

  async delete(id: string) {
    return prisma.meeting.delete({ where: { id } });
  },

  async addNotes(id: string, notes: string) {
    return prisma.meeting.update({
      where: { id },
      data: { notes: notes.slice(0, 50000) },
    });
  },

  async setTranscript(id: string, transcript: string) {
    return prisma.meeting.update({
      where: { id },
      data: { transcript: transcript.slice(0, 100000) },
    });
  },

  async generateAiSummary(id: string) {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new Error('meeting_not_found');

    const source = meeting.notes || meeting.transcript || '';
    if (!source.trim()) {
      return prisma.meeting.update({
        where: { id },
        data: { aiSummary: '' },
      });
    }

    const sentences = splitSentences(source);
    const actionItems = parseJsonArray(meeting.actionItems) as Array<Record<string, unknown>>;
    const decisions = parseJsonArray(meeting.decisions) as Array<Record<string, unknown>>;

    const parts: string[] = [];
    // Opening summary
    if (sentences.length > 0) {
      parts.push(`Summary: ${sentences[0].trim()}`);
    }
    // Closing note
    if (sentences.length > 2) {
      parts.push(`Closing: ${sentences[sentences.length - 1].trim()}`);
    }
    // Key action items
    if (actionItems.length > 0) {
      const items = actionItems.slice(0, 5).map((a) => {
        const text = typeof a === 'object' && a && 'text' in a ? String(a.text) : String(a);
        return `- ${text}`;
      });
      parts.push(`Action Items:\n${items.join('\n')}`);
    }
    // Key decisions
    if (decisions.length > 0) {
      const items = decisions.slice(0, 5).map((d) => {
        const text = typeof d === 'object' && d && 'text' in d ? String(d.text) : String(d);
        return `- ${text}`;
      });
      parts.push(`Decisions:\n${items.join('\n')}`);
    }

    const aiSummary = parts.join('\n\n').slice(0, 10000);
    return prisma.meeting.update({
      where: { id },
      data: { aiSummary },
    });
  },

  async extractActionItems(id: string) {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new Error('meeting_not_found');

    const source = meeting.notes || meeting.transcript || '';
    const lines = source.split('\n');
    const patterns = [
      /^\s*TODO\s*:?\s*(.+)/i,
      /^\s*ACTION\s*:?\s*(.+)/i,
      /^\s*FOLLOW\s*UP\s*:?\s*(.+)/i,
      /^\s*-\s*\[\s*\]\s*(.+)/i,
      /^\s*\*\s*\[\s*\]\s*(.+)/i,
    ];
    const actionItems: Array<Record<string, unknown>> = [];
    for (const line of lines) {
      for (const pat of patterns) {
        const m = line.match(pat);
        if (m && m[1] && m[1].trim()) {
          actionItems.push({
            id: `ai-${actionItems.length + 1}`,
            text: m[1].trim().slice(0, 500),
            status: 'open',
            assignee: null,
          });
          break;
        }
      }
    }

    const existing = parseJsonArray(meeting.actionItems) as Array<Record<string, unknown>>;
    const merged = [...existing, ...actionItems];
    const updated = await prisma.meeting.update({
      where: { id },
      data: { actionItems: JSON.stringify(merged) },
    });
    return { meeting: updated, actionItems: merged };
  },

  async extractDecisions(id: string) {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new Error('meeting_not_found');

    const source = meeting.notes || meeting.transcript || '';
    const lines = source.split('\n');
    const patterns = [
      /^\s*DECISION\s*:?\s*(.+)/i,
      /^\s*DECIDED\s*:?\s*(.+)/i,
      /^\s*AGREED\s*:?\s*(.+)/i,
      /^\s*RESOLVED\s*:?\s*(.+)/i,
    ];
    const decisions: Array<Record<string, unknown>> = [];
    for (const line of lines) {
      for (const pat of patterns) {
        const m = line.match(pat);
        if (m && m[1] && m[1].trim()) {
          decisions.push({
            id: `dec-${decisions.length + 1}`,
            text: m[1].trim().slice(0, 500),
          });
          break;
        }
      }
    }

    const existing = parseJsonArray(meeting.decisions) as Array<Record<string, unknown>>;
    const merged = [...existing, ...decisions];
    const updated = await prisma.meeting.update({
      where: { id },
      data: { decisions: JSON.stringify(merged) },
    });
    return { meeting: updated, decisions: merged };
  },

  async addFollowUp(id: string, input: {
    text: string;
    assignee?: string;
    dueDate?: Date;
  }) {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new Error('meeting_not_found');

    const followUps = parseJsonArray(meeting.followUps) as Array<Record<string, unknown>>;
    const followUp: Record<string, unknown> = {
      id: `fu-${Date.now()}`,
      text: input.text.slice(0, 500),
      assignee: input.assignee || null,
      dueDate: input.dueDate || null,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    followUps.push(followUp);

    const updated = await prisma.meeting.update({
      where: { id },
      data: { followUps: JSON.stringify(followUps) },
    });
    return { meeting: updated, followUp };
  },

  async getFollowUps(id: string) {
    const meeting = await safePrisma(() =>
      prisma.meeting.findUnique({ where: { id }, select: { followUps: true } }),
    null);
    if (!meeting) return [];
    return parseJsonArray(meeting.followUps);
  },

  async completeFollowUp(id: string, followUpId: string) {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new Error('meeting_not_found');

    const followUps = parseJsonArray(meeting.followUps) as Array<Record<string, unknown>>;
    const updated = followUps.map((fu) => {
      if (fu.id === followUpId) {
        return { ...fu, status: 'completed', completedAt: new Date().toISOString() };
      }
      return fu;
    });

    const result = await prisma.meeting.update({
      where: { id },
      data: { followUps: JSON.stringify(updated) },
    });
    return { meeting: result, followUps: updated };
  },

  async getStats(organizationId: string) {
    const [total, byType, byStatus, meetings, actionItemCount, decisionCount] = await Promise.all([
      safePrisma(() => prisma.meeting.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.meeting.groupBy({
          by: ['type'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.meeting.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.meeting.findMany({
          where: { organizationId, status: 'completed' },
          select: { duration: true },
        }),
      []),
      safePrisma(() =>
        prisma.meeting.findMany({
          where: { organizationId },
          select: { actionItems: true },
        }),
      []),
      safePrisma(() =>
        prisma.meeting.findMany({
          where: { organizationId },
          select: { decisions: true },
        }),
      []),
    ]);

    const typeCounts: Record<string, number> = {};
    for (const row of byType as Array<{ type: string; _count: number }>) {
      typeCounts[row.type] = row._count;
    }
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }

    const durations = (meetings as Array<{ duration: number }>).map((m) => m.duration);
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    let totalActionItems = 0;
    for (const m of actionItemCount as Array<{ actionItems: string }>) {
      totalActionItems += parseJsonArray(m.actionItems).length;
    }
    let totalDecisions = 0;
    for (const m of decisionCount as Array<{ decisions: string }>) {
      totalDecisions += parseJsonArray(m.decisions).length;
    }

    return {
      total,
      byType: typeCounts,
      byStatus: statusCounts,
      avgDuration,
      actionItemsCount: totalActionItems,
      decisionsCount: totalDecisions,
    };
  },

  async getUpcoming(organizationId: string, days = 7) {
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const meetings = await safePrisma(() =>
      prisma.meeting.findMany({
        where: {
          organizationId,
          scheduledAt: { gte: now, lte: end },
          status: { in: ['scheduled', 'in_progress'] },
        },
        orderBy: [{ scheduledAt: 'asc' }],
        take: 50,
      }),
    []);
    return meetings.map(parseMeetingJson);
  },

  async getActionItems(organizationId: string, opts?: {
    status?: string;
    assignee?: string;
    dateRange?: { start: Date; end: Date };
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.dateRange) {
      where.scheduledAt = { gte: opts.dateRange.start, lte: opts.dateRange.end };
    }
    const meetings = await safePrisma(() =>
      prisma.meeting.findMany({
        where,
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          actionItems: true,
        },
        orderBy: [{ scheduledAt: 'desc' }],
        take: 200,
      }),
    []);

    const allItems: Array<Record<string, unknown>> = [];
    for (const m of meetings as Array<{ id: string; title: string; scheduledAt: Date; actionItems: string }>) {
      const items = parseJsonArray(m.actionItems) as Array<Record<string, unknown>>;
      for (const item of items) {
        const status = String(item.status || 'open');
        const assignee = item.assignee ? String(item.assignee) : null;
        if (opts?.status && status !== opts.status) continue;
        if (opts?.assignee && assignee !== opts.assignee) continue;
        allItems.push({
          ...item,
          meetingId: m.id,
          meetingTitle: m.title,
          meetingDate: m.scheduledAt,
        });
      }
    }
    return allItems;
  },
};

// ── Helpers ──

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function parseJsonArray(raw: string): unknown[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function parseMeetingJson(meeting: Record<string, unknown>): Record<string, unknown> {
  return {
    ...meeting,
    attendeeIds: parseJsonArray(String(meeting.attendeeIds || '[]')),
    agenda: parseJsonArray(String(meeting.agenda || '[]')),
    actionItems: parseJsonArray(String(meeting.actionItems || '[]')),
    decisions: parseJsonArray(String(meeting.decisions || '[]')),
    followUps: parseJsonArray(String(meeting.followUps || '[]')),
    tags: parseJsonArray(String(meeting.tags || '[]')),
  };
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
