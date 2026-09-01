/**
 * Lightweight structured logging for creative tool execution and provider routing.
 * Logs are emitted via the structured logger (Cloudflare Worker logs) in JSON
 * format for downstream aggregation and monitoring.
 */

import { logger } from './logger';

export interface ToolExecutionEvent {
  tool: string;
  userId: string;
  cost: number;
  durationMs: number;
  success: boolean;
  error?: string;
  model?: string;
}

export interface ProviderRoutingEvent {
  capability: string;
  planTier: string;
  selectedModel: string;
  fallback: boolean;
}

export function logToolExecution(event: ToolExecutionEvent): void {
  logger.info('telemetry', 'tool_execution', {
    ...event,
    timestamp: new Date().toISOString(),
  });
}

export function logProviderRouting(event: ProviderRoutingEvent): void {
  logger.info('telemetry', 'provider_routing', {
    ...event,
    timestamp: new Date().toISOString(),
  });
}
