/**
 * Classify raw error strings into controlled error codes for client responses.
 * This prevents leaking internal error details (stack traces, file paths,
 * internal API messages) to clients while preserving enough information
 * for the UI to show user-friendly messages.
 *
 * The raw error should always be logged server-side; only the code is sent
 * to the client.
 */

export type PipelineErrorCode =
  | 'rate_limited'
  | 'insufficient_credits'
  | 'timeout'
  | 'network'
  | 'auth'
  | 'server'
  | 'unknown';

export function classifyPipelineError(rawError: string): PipelineErrorCode {
  const e = rawError.toLowerCase();
  if (e.includes('rate_limited') || e.includes('rate limit') || e.includes('429')) {
    return 'rate_limited';
  }
  if (e.includes('insufficient') && e.includes('credit')) {
    return 'insufficient_credits';
  }
  if (e.includes('timeout') || e.includes('timed out')) {
    return 'timeout';
  }
  if (e.includes('network') || e.includes('fetch') || e.includes('econnrefused')) {
    return 'network';
  }
  if (e.includes('auth') || e.includes('unauthorized') || e.includes('401')) {
    return 'auth';
  }
  if (e.includes('server') || e.includes('500') || e.includes('502') || e.includes('503')) {
    return 'server';
  }
  return 'unknown';
}
