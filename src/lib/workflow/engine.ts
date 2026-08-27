/**
 * Lightweight workflow engine with durable state tracking.
 *
 * Stores workflow runs and step states in D1/SQLite so that long-running
 * creative pipelines can be resumed, retried, and monitored.
 *
 * This is a minimal implementation — not a full durable execution engine.
 * Future: migrate to Cloudflare Workflows or Temporal for full durability.
 */

import { prisma } from '@/lib/prisma';
import { emit, emitWorkflowStarted, emitWorkflowCompleted, emitWorkflowFailed } from '@/lib/observability/events';

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface WorkflowRun {
  id: string;
  userId: string;
  workflowType: string;
  status: WorkflowStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  runId: string;
  stepName: string;
  status: StepStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  creditsCost?: number;
}

/**
 * Create a new workflow run.
 */
export async function startWorkflow(
  userId: string,
  workflowType: string,
  input: Record<string, unknown>,
): Promise<string> {
  const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  // Store in DB (non-fatal if table doesn't exist yet)
  try {
    await prisma.$executeRaw`
      INSERT INTO WorkflowRun (id, userId, workflowType, status, input, startedAt)
      VALUES (${id}, ${userId}, ${workflowType}, 'running', ${JSON.stringify(input)}, ${new Date().toISOString()})
    `;
  } catch {
    // Table may not exist in local dev — events still emitted
  }
  emitWorkflowStarted(userId, id, { workflowType });
  return id;
}

/**
 * Record a step within a workflow run.
 */
export async function recordStep(
  runId: string,
  stepName: string,
  status: StepStatus,
  data?: { input?: Record<string, unknown>; output?: Record<string, unknown>; error?: string; creditsCost?: number },
): Promise<void> {
  const stepId = `step_${runId}_${stepName}_${Date.now()}`;
  emit({
    type: status === 'completed' ? 'step.completed' : status === 'failed' ? 'step.failed' : 'step.started',
    timestamp: new Date().toISOString(),
    workflowId: runId,
    stepName,
    error: data?.error,
    credits: data?.creditsCost,
    metadata: data?.output,
  });
  try {
    await prisma.$executeRaw`
      INSERT INTO WorkflowStep (id, runId, stepName, status, input, output, error, creditsCost, startedAt, completedAt)
      VALUES (${stepId}, ${runId}, ${stepName}, ${status},
        ${data?.input ? JSON.stringify(data.input) : null},
        ${data?.output ? JSON.stringify(data.output) : null},
        ${data?.error || null},
        ${data?.creditsCost || null},
        ${new Date().toISOString()},
        ${status === 'completed' || status === 'failed' ? new Date().toISOString() : null})
    `;
  } catch {
    // Table may not exist — events still emitted
  }
}

/**
 * Complete a workflow run.
 */
export async function completeWorkflow(runId: string, userId: string, output: Record<string, unknown>, durationMs: number): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE WorkflowRun SET status = 'completed', output = ${JSON.stringify(output)}, completedAt = ${new Date().toISOString()}
      WHERE id = ${runId}
    `;
  } catch { /* non-fatal */ }
  emitWorkflowCompleted(userId, runId, durationMs, output);
}

/**
 * Fail a workflow run.
 */
export async function failWorkflow(runId: string, userId: string, error: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE WorkflowRun SET status = 'failed', error = ${error}, completedAt = ${new Date().toISOString()}
      WHERE id = ${runId}
    `;
  } catch { /* non-fatal */ }
  emitWorkflowFailed(userId, runId, error);
}

/**
 * Get a workflow run by ID (for status polling).
 */
export async function getWorkflowRun(runId: string): Promise<WorkflowRun | null> {
  try {
    const rows = await prisma.$queryRaw<WorkflowRun[]>`
      SELECT * FROM WorkflowRun WHERE id = ${runId} LIMIT 1
    `;
    return rows[0] || null;
  } catch {
    return null;
  }
}
