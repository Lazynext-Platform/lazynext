/**
 * Structured logging utility for Cloudflare Workers.
 *
 * All logs are emitted via console.log/error/warn and are automatically
 * captured by Cloudflare Workers. View them in real-time with:
 *   npx wrangler tail
 *
 * Or in the Cloudflare dashboard under Workers → lazynext → Logs.
 *
 * Logs are JSON-structured for easy filtering and searching.
 */

type LogLevel = 'info' | 'warn' | 'error';

function emit(level: LogLevel, tag: string, message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    tag,
    message,
    ...(meta ? { meta } : {}),
  };
  const serialized = JSON.stringify(entry);
  if (level === 'error') console.error(serialized);
  else if (level === 'warn') console.warn(serialized);
  else console.log(serialized);
}

export const logger = {
  info: (tag: string, message: string, meta?: Record<string, unknown>) => emit('info', tag, message, meta),
  warn: (tag: string, message: string, meta?: Record<string, unknown>) => emit('warn', tag, message, meta),
  error: (tag: string, message: string, meta?: Record<string, unknown>) => emit('error', tag, message, meta),
};

/**
 * Wrap an async handler with error logging. If the handler throws,
 * the error is logged with the tag and re-thrown (or returns a 500 response).
 */
export function withErrorLogging<T extends (...args: any[]) => Promise<any>>(
  tag: string,
  fn: T,
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error(tag, `Unhandled error: ${error.message}`, {
        stack: error.stack,
      });
      throw e;
    }
  }) as T;
}
