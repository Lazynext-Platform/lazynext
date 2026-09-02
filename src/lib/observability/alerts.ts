/**
 * Alert system for critical pipeline and tool failures.
 *
 * Sends structured alerts to a configurable webhook URL (ALERT_WEBHOOK_URL)
 * when critical events occur (pipeline failures, credit errors, provider
 * failures). If no webhook URL is configured, alerts are logged to console.
 *
 * This complements the existing telemetry logging (console.log) by providing
 * a push-based notification channel for critical failures that need immediate
 * attention, rather than requiring log aggregation and dashboard queries.
 *
 * Configuration:
 *   ALERT_WEBHOOK_URL — Slack, Discord, or generic webhook URL for alerts
 *   ALERT_WEBHOOK_SECRET — Optional secret token sent as Authorization header
 */

import { logger } from '../logger';

export interface AlertEvent {
  level: 'critical' | 'warning' | 'info';
  category: 'pipeline' | 'credits' | 'provider' | 'auth' | 'system';
  message: string;
  userId?: string;
  workflowId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/** Send an alert to the configured webhook (or log to console if not configured). */
export async function sendAlert(event: AlertEvent): Promise<void> {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  const secret = process.env.ALERT_WEBHOOK_SECRET;

  const payload = {
    ...event,
    timestamp: new Date().toISOString(),
    service: 'lazynext',
    environment: process.env.NODE_ENV || 'development',
  };

  if (!webhookUrl) {
    // No webhook configured — log as a structured alert
    logger.info('alert', event.message, payload);
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify(payload),
      // Don't let alert failures block the main flow
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
  } catch {
    // Alert delivery is best-effort — never block on it
  }
}

/** Convenience: alert on pipeline failure. */
export async function alertPipelineFailed(
  userId: string,
  pipelineId: string,
  error: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await sendAlert({
    level: 'critical',
    category: 'pipeline',
    message: `Pipeline ${pipelineId} failed`,
    userId,
    workflowId: pipelineId,
    error,
    metadata,
  });
}

/** Convenience: alert on credit system error. */
export async function alertCreditError(
  userId: string,
  error: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await sendAlert({
    level: 'critical',
    category: 'credits',
    message: 'Credit system error',
    userId,
    error,
    metadata,
  });
}

/** Convenience: alert on provider failure. */
export async function alertProviderFailed(
  userId: string,
  providerId: string,
  error: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await sendAlert({
    level: 'warning',
    category: 'provider',
    message: `Provider ${providerId} failed`,
    userId,
    error,
    metadata,
  });
}
