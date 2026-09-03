import { AuditService } from '@/lib/services/audit';

/**
 * Structured error logging service.
 * Logs errors with consistent structure for observability and debugging.
 * In production, errors are also sent to Cloudflare Workers observability.
 */

export type ErrorSeverity = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface StructuredError {
  message: string;
  severity: ErrorSeverity;
  code?: string;
  stack?: string;
  userId?: string;
  workspaceId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

class ErrorLogger {
  private log(error: StructuredError): void {
    const entry = {
      timestamp: new Date().toISOString(),
      ...error,
    };

    // Console output with structured format (captured by Cloudflare Workers logs)
    const consoleMethod = error.severity === 'fatal' || error.severity === 'error'
      ? console.error
      : error.severity === 'warn'
        ? console.warn
        : console.log;

    consoleMethod(JSON.stringify(entry));

    // For severe errors, also log to audit trail
    if ((error.severity === 'error' || error.severity === 'fatal') && error.userId) {
      AuditService.log({
        userId: error.userId,
        workspaceId: error.workspaceId,
        action: 'system.error',
        targetType: 'error',
        metadata: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          path: error.path,
          ...error.metadata,
        },
      }).catch(() => {});
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log({ message, severity: 'debug', metadata });
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log({ message, severity: 'info', metadata });
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log({ message, severity: 'warn', metadata });
  }

  error(message: string, opts?: Partial<StructuredError>): void {
    this.log({ message, severity: 'error', ...opts });
  }

  fatal(message: string, opts?: Partial<StructuredError>): void {
    this.log({ message, severity: 'fatal', ...opts });
  }

  /**
   * Wrap an async handler with automatic error logging.
   * Returns the result or re-throws after logging.
   */
  async wrap<T>(fn: () => Promise<T>, context?: Partial<StructuredError>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.error(message, { ...context, stack });
      throw err;
    }
  }
}

export const logger = new ErrorLogger();
