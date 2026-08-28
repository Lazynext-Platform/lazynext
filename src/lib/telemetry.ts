/**
 * Lightweight structured logging for creative tool execution and provider routing.
 * Logs are emitted to console (Cloudflare Worker logs) in JSON format for
 * downstream aggregation and monitoring.
 */

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
  console.log(JSON.stringify({
    type: 'tool_execution',
    ...event,
    timestamp: new Date().toISOString(),
  }));
}

export function logProviderRouting(event: ProviderRoutingEvent): void {
  console.log(JSON.stringify({
    type: 'provider_routing',
    ...event,
    timestamp: new Date().toISOString(),
  }));
}
