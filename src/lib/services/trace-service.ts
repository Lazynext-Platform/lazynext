import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface StartTraceInput {
  rootSpanName: string;
  labels?: Record<string, unknown>;
}

export interface StartSpanInput {
  traceId: string;
  parentSpanId?: string;
  name: string;
  service: string;
  operation: string;
  attributes?: Record<string, unknown>;
}

export interface ListTracesOptions {
  status?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}

export interface TraceStats {
  total: number;
  avgDurationMs: number;
  errorRate: number;
  errorCount: number;
  slowTraces: number;
  slowThresholdMs: number;
}

export interface ServiceMapNode {
  service: string;
  spanCount: number;
  errorCount: number;
  avgDurationMs: number;
  dependencies: string[];
}

// ── Helpers ──

function generateId(): string {
  // Generate a hex-like trace/span ID
  return Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
}

// ── Trace Service ──

export const TraceService = {
  /**
   * Start a new trace. Returns the traceId.
   */
  async startTrace(organizationId: string, input: StartTraceInput): Promise<string> {
    const traceId = generateId();
    await prisma.trace.create({
      data: {
        organizationId,
        traceId,
        rootSpanName: input.rootSpanName.slice(0, 200),
        status: 'ok',
        durationMs: 0,
        spanCount: 0,
        serviceCount: 0,
        labels: JSON.stringify(input.labels || {}),
      },
    });
    return traceId;
  },

  /**
   * Mark a trace as ended with final status and duration.
   */
  async endTrace(traceId: string, status: string, durationMs: number) {
    return safePrisma(() =>
      prisma.trace.update({
        where: { traceId },
        data: {
          status,
          durationMs,
          endedAt: new Date(),
        },
      }),
    null);
  },

  /**
   * Start a span within a trace. Returns the spanId.
   */
  async startSpan(organizationId: string, input: StartSpanInput): Promise<string> {
    const spanId = generateId();
    await prisma.span.create({
      data: {
        organizationId,
        traceId: input.traceId,
        spanId,
        parentSpanId: input.parentSpanId || null,
        name: input.name.slice(0, 200),
        service: input.service.slice(0, 100),
        operation: input.operation.slice(0, 100),
        status: 'ok',
        durationMs: 0,
        attributes: JSON.stringify(input.attributes || {}),
        events: '[]',
      },
    });

    // Increment trace span count
    await safePrisma(() =>
      prisma.trace.update({
        where: { traceId: input.traceId },
        data: { spanCount: { increment: 1 } },
      }),
    null);

    return spanId;
  },

  /**
   * End a span with final status, duration, and optional events.
   */
  async endSpan(spanId: string, status: string, durationMs: number, events?: unknown[]) {
    return safePrisma(() =>
      prisma.span.update({
        where: { spanId },
        data: {
          status,
          durationMs,
          endTime: new Date(),
          events: JSON.stringify(events || []),
        },
      }),
    null);
  },

  /**
   * Get a trace with all its spans.
   */
  async getTrace(traceId: string) {
    const trace = await safePrisma(() =>
      prisma.trace.findUnique({
        where: { traceId },
      }),
    null);
    if (!trace) return null;

    const spans = await safePrisma(() =>
      prisma.span.findMany({
        where: { traceId },
        orderBy: { startTime: 'asc' },
        take: 1000,
      }),
    []);

    // Update service count from spans
    const services = new Set(spans.map((s) => s.service));

    return {
      ...trace,
      spans,
      serviceCount: services.size,
    };
  },

  /**
   * List traces for an organization, optionally filtered by status/time.
   */
  async listTraces(organizationId: string, opts?: ListTracesOptions) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.status) where.status = opts.status;
    if (opts?.startTime || opts?.endTime) {
      where.startedAt = {};
      if (opts?.startTime) (where.startedAt as Record<string, unknown>).gte = opts.startTime;
      if (opts?.endTime) (where.startedAt as Record<string, unknown>).lte = opts.endTime;
    }

    return safePrisma(() =>
      prisma.trace.findMany({
        where: where as never,
        orderBy: { startedAt: 'desc' },
        take: opts?.limit ?? 100,
      }),
    []);
  },

  /**
   * Get trace statistics: count, avg duration, error rate, slow traces.
   */
  async getTraceStats(organizationId: string, opts?: ListTracesOptions): Promise<TraceStats> {
    const traces = await this.listTraces(organizationId, opts);
    const total = traces.length;
    const errorCount = traces.filter((t) => t.status === 'error').length;
    const slowThresholdMs = 1000;
    const slowTraces = traces.filter((t) => t.durationMs > slowThresholdMs).length;
    const totalDuration = traces.reduce((acc, t) => acc + t.durationMs, 0);

    return {
      total,
      avgDurationMs: total > 0 ? totalDuration / total : 0,
      errorRate: total > 0 ? errorCount / total : 0,
      errorCount,
      slowTraces,
      slowThresholdMs,
    };
  },

  /**
   * Build a service dependency map from spans.
   * Returns nodes with service info and their dependencies (parent services).
   */
  async getServiceMap(organizationId: string): Promise<ServiceMapNode[]> {
    const spans = await safePrisma(() =>
      prisma.span.findMany({
        where: { organizationId },
        orderBy: { startTime: 'desc' },
        take: 5000,
        select: {
          spanId: true,
          parentSpanId: true,
          service: true,
          status: true,
          durationMs: true,
        },
      }),
    []);

    // Build spanId → service map for parent lookups
    const spanServiceMap: Record<string, string> = {};
    for (const s of spans) {
      spanServiceMap[s.spanId] = s.service;
    }

    // Aggregate per service
    const nodeMap: Record<string, {
      service: string;
      spanCount: number;
      errorCount: number;
      totalDuration: number;
      dependencies: Set<string>;
    }> = {};

    for (const s of spans) {
      if (!nodeMap[s.service]) {
        nodeMap[s.service] = {
          service: s.service,
          spanCount: 0,
          errorCount: 0,
          totalDuration: 0,
          dependencies: new Set<string>(),
        };
      }
      const node = nodeMap[s.service];
      node.spanCount++;
      if (s.status === 'error') node.errorCount++;
      node.totalDuration += s.durationMs;

      // Find parent service
      if (s.parentSpanId && spanServiceMap[s.parentSpanId]) {
        const parentService = spanServiceMap[s.parentSpanId];
        if (parentService !== s.service) {
          node.dependencies.add(parentService);
        }
      }
    }

    return Object.values(nodeMap).map((n) => ({
      service: n.service,
      spanCount: n.spanCount,
      errorCount: n.errorCount,
      avgDurationMs: n.spanCount > 0 ? n.totalDuration / n.spanCount : 0,
      dependencies: Array.from(n.dependencies).sort(),
    }));
  },

  /**
   * Delete traces (and their spans) older than the given date (retention cleanup).
   */
  async deleteOldTraces(organizationId: string, beforeDate: Date) {
    // Delete spans for old traces first
    const traceResult = await safePrisma(() =>
      prisma.trace.deleteMany({
        where: {
          organizationId,
          startedAt: { lt: beforeDate },
        },
      }),
    { count: 0 });

    // Delete orphaned spans (traceId no longer exists)
    await safePrisma(() =>
      prisma.span.deleteMany({
        where: {
          organizationId,
          startTime: { lt: beforeDate },
        },
      }),
    { count: 0 });

    return traceResult;
  },
};
