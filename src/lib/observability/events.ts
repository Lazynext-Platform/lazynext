/**
 * Structured workflow events for observability.
 *
 * Events are emitted at key points in the creative pipeline and generation
 * workflows. They can be logged, sent to analytics, or stored for debugging.
 *
 * Future: integrate with Cloudflare Workers Analytics Engine or external
 * observability platforms.
 */

import { logger } from '../logger';

export type WorkflowEventType =
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'step.started'
  | 'step.completed'
  | 'step.failed'
  | 'provider.selected'
  | 'provider.called'
  | 'provider.completed'
  | 'provider.failed'
  | 'credits.charged'
  | 'credits.refunded'
  | 'creative.scored'
  | 'creative.variant_generated';

export interface WorkflowEvent {
  type: WorkflowEventType;
  timestamp: string;
  userId?: string;
  workflowId?: string;
  stepName?: string;
  providerId?: string;
  modelId?: string;
  durationMs?: number;
  credits?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

type EventHandler = (event: WorkflowEvent) => void;

const handlers: EventHandler[] = [];

/** Register a handler for all workflow events. */
export function onWorkflowEvent(handler: EventHandler): () => void {
  handlers.push(handler);
  return () => {
    const idx = handlers.indexOf(handler);
    if (idx >= 0) handlers.splice(idx, 1);
  };
}

/** Emit a workflow event to all registered handlers. */
export function emit(event: WorkflowEvent): void {
  for (const h of handlers) {
    try { h(event); } catch { /* handler errors are non-fatal */ }
  }
  // Also log for development visibility
  if (process.env.NODE_ENV !== 'production') {
    const meta: Record<string, unknown> = {};
    if (event.workflowId) meta.workflowId = event.workflowId;
    if (event.stepName) meta.stepName = event.stepName;
    if (event.providerId) meta.providerId = event.providerId;
    if (event.modelId) meta.modelId = event.modelId;
    if (event.durationMs) meta.durationMs = event.durationMs;
    if (event.credits) meta.credits = event.credits;
    if (event.error) meta.error = event.error;
    logger.info('workflow-event', event.type, meta);
  }
}

/** Helper: emit a workflow.started event. */
export function emitWorkflowStarted(userId: string, workflowId: string, metadata?: Record<string, unknown>) {
  emit({ type: 'workflow.started', timestamp: new Date().toISOString(), userId, workflowId, metadata });
}

/** Helper: emit a workflow.completed event. */
export function emitWorkflowCompleted(userId: string, workflowId: string, durationMs: number, metadata?: Record<string, unknown>) {
  emit({ type: 'workflow.completed', timestamp: new Date().toISOString(), userId, workflowId, durationMs, metadata });
}

/** Helper: emit a workflow.failed event. */
export function emitWorkflowFailed(userId: string, workflowId: string, error: string, metadata?: Record<string, unknown>) {
  emit({ type: 'workflow.failed', timestamp: new Date().toISOString(), userId, workflowId, error, metadata });
}

/** Helper: emit a provider.called event. */
export function emitProviderCalled(userId: string, providerId: string, modelId: string, metadata?: Record<string, unknown>) {
  emit({ type: 'provider.called', timestamp: new Date().toISOString(), userId, providerId, modelId, metadata });
}

/** Helper: emit a provider.completed event. */
export function emitProviderCompleted(userId: string, providerId: string, modelId: string, durationMs: number, metadata?: Record<string, unknown>) {
  emit({ type: 'provider.completed', timestamp: new Date().toISOString(), userId, providerId, modelId, durationMs, metadata });
}

/** Helper: emit a credits.charged event. */
export function emitCreditsCharged(userId: string, credits: number, reason: string) {
  emit({ type: 'credits.charged', timestamp: new Date().toISOString(), userId, credits, metadata: { reason } });
}

/** Helper: emit a credits.refunded event. */
export function emitCreditsRefunded(userId: string, credits: number, reason: string) {
  emit({ type: 'credits.refunded', timestamp: new Date().toISOString(), userId, credits, metadata: { reason } });
}
