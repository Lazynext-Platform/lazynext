import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type DripSequenceStatus = 'active' | 'paused' | 'completed';

export interface DripStep {
  id: string;
  name: string;
  templateId?: string;
  delayMinutes: number;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
}

export interface DripSequenceData {
  name: string;
  description?: string;
  steps: DripStep[];
  status?: DripSequenceStatus;
  listId?: string;
  trigger?: string;
}

export interface EnrollmentData {
  subscriberId: string;
  sequenceId: string;
  currentStep: number;
  status: 'active' | 'completed' | 'cancelled';
  enrolledAt: string;
  nextStepAt: string;
  completedSteps: string[];
}

export interface DripSequenceStats {
  total: number;
  byStatus: Record<string, number>;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
}

// ── Helpers ──

function parseRecord(mem: {
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

function genId(): string {
  return `step_${Math.random().toString(36).slice(2, 10)}`;
}

// ── Drip Sequence Service ──

export const DripSequenceService = {
  /**
   * Create a new drip sequence stored as a Memory record.
   */
  async create(input: {
    workspaceId: string;
    organizationId: string;
    createdBy: string;
    data: DripSequenceData;
  }) {
    const content = JSON.stringify({
      name: input.data.name,
      description: input.data.description || '',
      steps: input.data.steps || [],
      status: input.data.status || 'active',
      listId: input.data.listId || null,
      trigger: input.data.trigger || 'manual',
    });
    return prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'drip_sequence',
        content: content.slice(0, 10000),
        source: 'user',
        sourceId: input.createdBy,
        confidence: 0.9,
        owner: input.createdBy,
        lifecycle: 'long',
        tags: JSON.stringify(['drip_sequence']),
        createdBy: input.createdBy,
      },
    });
  },

  /**
   * Get a single drip sequence by ID.
   */
  async get(id: string) {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null);
    if (!mem || mem.type !== 'drip_sequence') return null;
    return parseRecord(mem);
  },

  /**
   * List all drip sequences for a workspace.
   */
  async list(workspaceId: string) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: { workspaceId, type: 'drip_sequence' },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    []);
    return memories.map(parseRecord);
  },

  /**
   * Update a drip sequence's data.
   */
  async update(id: string, data: Partial<DripSequenceData>) {
    const existing = await this.get(id);
    if (!existing) throw new Error('Drip sequence not found');

    const merged: DripSequenceData = {
      name: String(existing.name || ''),
      description: existing.description as string | undefined,
      steps: (existing.steps as DripStep[]) || [],
      status: (existing.status as DripSequenceStatus) || 'active',
      listId: existing.listId as string | undefined,
      trigger: existing.trigger as string | undefined,
    };

    if (data.name !== undefined) merged.name = data.name;
    if (data.description !== undefined) merged.description = data.description;
    if (data.steps !== undefined) merged.steps = data.steps;
    if (data.status !== undefined) merged.status = data.status;
    if (data.listId !== undefined) merged.listId = data.listId;
    if (data.trigger !== undefined) merged.trigger = data.trigger;

    const content = JSON.stringify({
      name: merged.name,
      description: merged.description || '',
      steps: merged.steps,
      status: merged.status,
      listId: merged.listId || null,
      trigger: merged.trigger || 'manual',
    });

    return prisma.memory.update({
      where: { id },
      data: {
        content: content.slice(0, 10000),
        tags: JSON.stringify(['drip_sequence']),
      },
    });
  },

  /**
   * Delete a drip sequence.
   */
  async delete(id: string) {
    return prisma.memory.delete({ where: { id } });
  },

  /**
   * Add a step to a drip sequence.
   */
  async addStep(id: string, step: Omit<DripStep, 'id'>) {
    const seq = await this.get(id);
    if (!seq) throw new Error('Drip sequence not found');
    const steps = (seq.steps as DripStep[]) || [];
    const newStep: DripStep = { ...step, id: genId() };
    steps.push(newStep);
    return this.update(id, { steps });
  },

  /**
   * Remove a step from a drip sequence by step ID.
   */
  async removeStep(id: string, stepId: string) {
    const seq = await this.get(id);
    if (!seq) throw new Error('Drip sequence not found');
    const steps = ((seq.steps as DripStep[]) || []).filter((s) => s.id !== stepId);
    return this.update(id, { steps });
  },

  /**
   * Reorder steps in a drip sequence.
   */
  async reorderSteps(id: string, stepIds: string[]) {
    const seq = await this.get(id);
    if (!seq) throw new Error('Drip sequence not found');
    const existingSteps = (seq.steps as DripStep[]) || [];
    const reordered: DripStep[] = [];
    for (const sid of stepIds) {
      const found = existingSteps.find((s) => s.id === sid);
      if (found) reordered.push(found);
    }
    // Append any steps not in the reorder list
    for (const s of existingSteps) {
      if (!stepIds.includes(s.id)) reordered.push(s);
    }
    return this.update(id, { steps: reordered });
  },

  /**
   * Enroll a subscriber in a drip sequence (creates a drip_enrollment Memory).
   */
  async enrollSubscriber(sequenceId: string, subscriberId: string, actorId: string) {
    const seq = await this.get(sequenceId);
    if (!seq) throw new Error('Drip sequence not found');
    const steps = (seq.steps as DripStep[]) || [];
    const firstDelay = steps.length > 0 ? steps[0].delayMinutes : 0;
    const nextStepAt = new Date(Date.now() + firstDelay * 60_000).toISOString();

    const content = JSON.stringify({
      subscriberId,
      sequenceId,
      currentStep: 0,
      status: 'active',
      enrolledAt: new Date().toISOString(),
      nextStepAt,
      completedSteps: [],
    });

    return prisma.memory.create({
      data: {
        workspaceId: String(seq.workspaceId),
        organizationId: String(seq.organizationId),
        type: 'drip_enrollment',
        content: content.slice(0, 10000),
        source: 'user',
        sourceId: actorId,
        confidence: 0.9,
        owner: actorId,
        lifecycle: 'medium',
        tags: JSON.stringify(['drip_enrollment', sequenceId, subscriberId]),
        createdBy: actorId,
      },
    });
  },

  /**
   * Unenroll a subscriber from a drip sequence (cancel enrollment).
   */
  async unenrollSubscriber(sequenceId: string, subscriberId: string) {
    const enrollments = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'drip_enrollment',
          tags: { contains: `"${sequenceId}"` },
          content: { contains: `"subscriberId":"${subscriberId}"` },
        },
        take: 100,
      }),
    []);

    const results: unknown[] = [];
    for (const enr of enrollments) {
      let data: EnrollmentData;
      try { data = JSON.parse(enr.content); } catch { continue; }
      if (data.status !== 'active') continue;
      data.status = 'cancelled';
      const updated = await safePrisma(() =>
        prisma.memory.update({
          where: { id: enr.id },
          data: { content: JSON.stringify(data).slice(0, 10000) },
        }),
      null);
      results.push(updated);
    }
    return results;
  },

  /**
   * Get all enrollments for a drip sequence.
   */
  async getEnrollments(sequenceId: string) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'drip_enrollment',
          tags: { contains: `"${sequenceId}"` },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    []);
    return memories.map(parseRecord);
  },

  /**
   * Get a subscriber's progress across all drip sequences.
   */
  async getSubscriberProgress(subscriberId: string) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'drip_enrollment',
          tags: { contains: `"${subscriberId}"` },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    []);
    return memories.map(parseRecord);
  },

  /**
   * Process pending steps for all active enrollments whose nextStepAt has passed.
   * Records events for each processed step and advances the enrollment.
   */
  async processPendingSteps(): Promise<{ processed: number; events: unknown[] }> {
    const now = new Date();
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'drip_enrollment',
          content: { contains: '"status":"active"' },
        },
        take: 500,
      }),
    []);

    let processed = 0;
    const events: unknown[] = [];

    for (const mem of memories) {
      let enr: EnrollmentData;
      try { enr = JSON.parse(mem.content); } catch { continue; }
      if (enr.status !== 'active') continue;

      const nextStepAt = new Date(enr.nextStepAt);
      if (nextStepAt > now) continue;

      // Fetch the sequence to get step details
      const seqMem = await safePrisma(() =>
        prisma.memory.findUnique({ where: { id: enr.sequenceId } }),
      null);
      if (!seqMem || seqMem.type !== 'drip_sequence') continue;

      let seqData: DripSequenceData;
      try { seqData = JSON.parse(seqMem.content); } catch { continue; }
      const steps = seqData.steps || [];

      if (enr.currentStep >= steps.length) {
        // Sequence completed
        enr.status = 'completed';
        await safePrisma(() =>
          prisma.memory.update({
            where: { id: mem.id },
            data: { content: JSON.stringify(enr).slice(0, 10000) },
          }),
        null);
        processed += 1;
        continue;
      }

      const step = steps[enr.currentStep];
      // Record an event for the step
      const evt = await safePrisma(() =>
        prisma.event.create({
          data: {
            workspaceId: seqMem.workspaceId,
            organizationId: seqMem.organizationId,
            type: 'drip.step_sent',
            actor: 'system',
            actorType: 'system',
            resourceType: 'drip_sequence',
            resourceId: enr.sequenceId,
            metadata: JSON.stringify({
              sequenceId: enr.sequenceId,
              subscriberId: enr.subscriberId,
              stepId: step.id,
              stepName: step.name,
            }),
            source: 'drip_sequence',
          },
        }),
      null);
      events.push(evt);

      // Advance enrollment
      enr.completedSteps.push(step.id);
      enr.currentStep += 1;
      if (enr.currentStep >= steps.length) {
        enr.status = 'completed';
        enr.nextStepAt = new Date().toISOString();
      } else {
        const nextDelay = steps[enr.currentStep].delayMinutes;
        enr.nextStepAt = new Date(Date.now() + nextDelay * 60_000).toISOString();
      }

      await safePrisma(() =>
        prisma.memory.update({
          where: { id: mem.id },
          data: { content: JSON.stringify(enr).slice(0, 10000) },
        }),
      null);
      processed += 1;
    }

    return { processed, events };
  },

  /**
   * Get aggregate stats for drip sequences in a workspace.
   */
  async getStats(workspaceId: string): Promise<DripSequenceStats> {
    const sequences = await this.list(workspaceId);
    const byStatus: Record<string, number> = {};
    for (const s of sequences) {
      const st = String(s.status || 'active');
      byStatus[st] = (byStatus[st] || 0) + 1;
    }

    // Count enrollments
    const enrollments = await safePrisma(() =>
      prisma.memory.findMany({
        where: { workspaceId, type: 'drip_enrollment' },
        take: 1000,
      }),
    []);

    let activeEnrollments = 0, completedEnrollments = 0;
    for (const e of enrollments) {
      let data: EnrollmentData;
      try { data = JSON.parse(e.content); } catch { continue; }
      if (data.status === 'active') activeEnrollments += 1;
      if (data.status === 'completed') completedEnrollments += 1;
    }

    return {
      total: sequences.length,
      byStatus,
      totalEnrollments: enrollments.length,
      activeEnrollments,
      completedEnrollments,
    };
  },
};
