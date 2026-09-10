/**
 * Deployment Service — manages the deployment pipeline for the Lazynext OS.
 *
 * Connects the coding loop to actual Cloudflare Workers deployments via
 * OpenNext. Tracks deployments triggered by the coding loop (after a PR
 * merge) or manually, records build/deploy logs, performs health checks,
 * and supports rollback to a previous successful deployment.
 *
 * In production, `triggerBuild` would invoke `npm run cf:build` and
 * `triggerDeploy` would invoke `npm run cf:deploy`. For now, these
 * methods record the intent and return instructions so the pipeline can
 * be wired up incrementally.
 */

import { execSync } from 'child_process';

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type DeploymentEnvironment = 'production' | 'staging' | 'preview';
export type DeploymentStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'live'
  | 'failed'
  | 'rolled_back'
  | 'cancelled';
export type DeploymentTrigger = 'manual' | 'coding_loop' | 'pr_merge' | 'scheduled';
export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded' | 'unknown';

export interface CreateDeploymentInput {
  environment?: string;
  trigger?: string;
  prNumber?: number | null;
  commitSha?: string | null;
  branch?: string | null;
  triggeredBy?: string | null;
}

export interface UpdateDeploymentInput {
  environment?: string;
  status?: string;
  trigger?: string;
  prNumber?: number | null;
  commitSha?: string | null;
  branch?: string | null;
  buildLog?: string;
  deployLog?: string;
  healthCheckUrl?: string | null;
  healthStatus?: string | null;
  rollbackFromId?: string | null;
  triggeredBy?: string | null;
  approvedBy?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

export interface DeploymentStats {
  total: number;
  byStatus: Record<string, number>;
  byEnvironment: Record<string, number>;
  successRate: number; // 0-100
  avgDurationMs: number; // average completed deployment duration
}

export interface BuildInstructions {
  deploymentId: string;
  status: string;
  command: string;
  message: string;
}

export interface DeployInstructions {
  deploymentId: string;
  status: string;
  command: string;
  message: string;
}

export interface HealthCheckResult {
  deploymentId: string;
  healthStatus: HealthStatus;
  healthCheckUrl: string | null;
  message: string;
}

// ── Deployment Service ──

export const DeploymentService = {
  /**
   * List deployments for a workspace, optionally filtered by status/environment.
   */
  async listDeployments(
    workspaceId: string,
    opts?: { status?: string; environment?: string; take?: number },
  ) {
    return safePrisma(() =>
      prisma.deployment.findMany({
        where: {
          workspaceId,
          ...(opts?.status && { status: opts.status }),
          ...(opts?.environment && { environment: opts.environment }),
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(opts?.take ?? 50, 200),
      }),
    []);
  },

  /**
   * Get a single deployment by ID.
   */
  async getDeployment(id: string) {
    return safePrisma(() =>
      prisma.deployment.findUnique({
        where: { id },
      }),
    null);
  },

  /**
   * Create a new deployment record.
   * Resolves the organizationId from the workspace.
   */
  async createDeployment(workspaceId: string, input: CreateDeploymentInput) {
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      }),
    null);

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    return prisma.deployment.create({
      data: {
        workspaceId,
        organizationId: workspace.organizationId,
        environment: input.environment || 'production',
        trigger: input.trigger || 'manual',
        prNumber: input.prNumber ?? null,
        commitSha: input.commitSha ?? null,
        branch: input.branch ?? null,
        triggeredBy: input.triggeredBy ?? null,
        status: 'pending',
      },
    });
  },

  /**
   * Update arbitrary deployment fields.
   */
  async updateDeployment(id: string, input: UpdateDeploymentInput) {
    const data: Record<string, unknown> = {};
    if (input.environment !== undefined) data.environment = input.environment;
    if (input.status !== undefined) data.status = input.status;
    if (input.trigger !== undefined) data.trigger = input.trigger;
    if (input.prNumber !== undefined) data.prNumber = input.prNumber;
    if (input.commitSha !== undefined) data.commitSha = input.commitSha;
    if (input.branch !== undefined) data.branch = input.branch;
    if (input.buildLog !== undefined) data.buildLog = input.buildLog;
    if (input.deployLog !== undefined) data.deployLog = input.deployLog;
    if (input.healthCheckUrl !== undefined) data.healthCheckUrl = input.healthCheckUrl;
    if (input.healthStatus !== undefined) data.healthStatus = input.healthStatus;
    if (input.rollbackFromId !== undefined) data.rollbackFromId = input.rollbackFromId;
    if (input.triggeredBy !== undefined) data.triggeredBy = input.triggeredBy;
    if (input.approvedBy !== undefined) data.approvedBy = input.approvedBy;
    if (input.startedAt !== undefined) data.startedAt = input.startedAt;
    if (input.completedAt !== undefined) data.completedAt = input.completedAt;

    return prisma.deployment.update({ where: { id }, data });
  },

  /**
   * Update the deployment status and append a log line to the
   * appropriate log field (buildLog for building, deployLog for
   * deploying/live/failed).
   */
  async updateStatus(id: string, status: DeploymentStatus, logs?: string) {
    const deployment = await safePrisma(() =>
      prisma.deployment.findUnique({ where: { id } }),
    null);

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    const data: Record<string, unknown> = { status };

    // Append logs to the correct field
    if (logs) {
      const timestamp = new Date().toISOString();
      const logLine = `[${timestamp}] ${logs}\n`;
      if (status === 'building') {
        data.buildLog = (deployment.buildLog || '') + logLine;
      } else if (status === 'deploying' || status === 'live' || status === 'failed') {
        data.deployLog = (deployment.deployLog || '') + logLine;
      }
    }

    // Set timestamps for lifecycle transitions
    if (status === 'building' && !deployment.startedAt) {
      data.startedAt = new Date();
    }
    if (status === 'live' || status === 'failed' || status === 'cancelled' || status === 'rolled_back') {
      data.completedAt = new Date();
    }

    // Update health status when going live
    if (status === 'live') {
      data.healthStatus = 'unknown';
    }

    return prisma.deployment.update({ where: { id }, data });
  },

  /**
   * Trigger a build for a deployment.
   *
   * Marks the deployment as 'building', records the start time, then
   * shells out to `npm run cf:build` and captures the output. On
   * failure the deployment is marked 'failed' and the error output is
   * recorded in the build log.
   */
  async triggerBuild(deploymentId: string): Promise<BuildInstructions> {
    await this.updateStatus(deploymentId, 'building', 'Build triggered');

    const command = 'npm run cf:build';
    let output = '';
    let failed = false;

    try {
      output = execSync(command, {
        encoding: 'utf-8',
        timeout: 10 * 60 * 1000, // 10 minutes
        maxBuffer: 10 * 1024 * 1024, // 10 MB
      });
    } catch (err) {
      failed = true;
      const error = err as { stderr?: string; stdout?: string; message?: string };
      output = (error.stderr || '') + (error.stdout || '') + (error.message || '');
    }

    // Record the build output (success or failure) in the build log
    await this.updateStatus(
      deploymentId,
      failed ? 'failed' : 'building',
      `Build ${failed ? 'failed' : 'completed'}:\n${output.slice(-8000)}`,
    ).catch(() => {});

    return {
      deploymentId,
      status: failed ? 'failed' : 'building',
      command,
      message: failed
        ? 'Build failed. See build log for details.'
        : 'Build completed successfully. Run `triggerDeploy` to deploy to Cloudflare Workers.',
    };
  },

  /**
   * Trigger a deploy for a deployment.
   *
   * Marks the deployment as 'deploying', then shells out to
   * `npm run cf:deploy` and captures the output. On failure the
   * deployment is marked 'failed' and the error output is recorded in
   * the deploy log. On success the deployment is marked 'live'.
   */
  async triggerDeploy(deploymentId: string): Promise<DeployInstructions> {
    await this.updateStatus(deploymentId, 'deploying', 'Deploy triggered');

    const command = 'npm run cf:deploy';
    let output = '';
    let failed = false;

    try {
      output = execSync(command, {
        encoding: 'utf-8',
        timeout: 10 * 60 * 1000, // 10 minutes
        maxBuffer: 10 * 1024 * 1024, // 10 MB
      });
    } catch (err) {
      failed = true;
      const error = err as { stderr?: string; stdout?: string; message?: string };
      output = (error.stderr || '') + (error.stdout || '') + (error.message || '');
    }

    // Record the deploy output (success or failure) in the deploy log
    await this.updateStatus(
      deploymentId,
      failed ? 'failed' : 'live',
      `Deploy ${failed ? 'failed' : 'completed'}:\n${output.slice(-8000)}`,
    ).catch(() => {});

    return {
      deploymentId,
      status: failed ? 'failed' : 'live',
      command,
      message: failed
        ? 'Deploy failed. See deploy log for details.'
        : 'Deploy completed successfully. The deployment is now live.',
    };
  },

  /**
   * Check the health of a deployment.
   *
   * Fetches the deployment's `healthCheckUrl` and parses the response to
   * determine healthy/unhealthy/degraded. If no URL is configured, returns
   * 'unknown'. If the fetch fails or the response is not ok, returns
   * 'unhealthy'. Otherwise returns 'healthy'.
   */
  async checkHealth(deploymentId: string): Promise<HealthCheckResult> {
    const deployment = await safePrisma(() =>
      prisma.deployment.findUnique({
        where: { id: deploymentId },
        select: { healthCheckUrl: true, status: true },
      }),
    null);

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    const healthCheckUrl = deployment.healthCheckUrl;

    // No URL configured — cannot determine health
    if (!healthCheckUrl) {
      const healthStatus: HealthStatus = 'unknown';
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { healthStatus },
      }).catch(() => {});

      return {
        deploymentId,
        healthStatus,
        healthCheckUrl: null,
        message: 'No healthCheckUrl configured. Cannot determine deployment health.',
      };
    }

    let healthStatus: HealthStatus = 'unhealthy';
    let message = 'Health check failed — fetch request errored.';

    try {
      const response = await fetch(healthCheckUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      if (response.ok) {
        healthStatus = 'healthy';
        message = 'Health check succeeded — deployment is responding.';
      } else {
        healthStatus = 'unhealthy';
        message = `Health check failed — received HTTP ${response.status} ${response.statusText}.`;
      }
    } catch (err) {
      healthStatus = 'unhealthy';
      const error = err as { message?: string };
      message = `Health check failed — fetch error: ${error.message || 'unknown error'}.`;
    }

    // Persist the health status
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { healthStatus },
    }).catch(() => {});

    return {
      deploymentId,
      healthStatus,
      healthCheckUrl,
      message,
    };
  },

  /**
   * Roll back to a previous deployment.
   *
   * Steps:
   * 1. Mark the current (failed) deployment as 'rolled_back'
   * 2. Find the previous successful ('live') deployment for the same environment
   * 3. Create a new deployment record with rollbackFromId set to the
   *    previous successful deployment's ID
   * 4. Return the new rollback deployment
   */
  async rollback(deploymentId: string) {
    const deployment = await safePrisma(() =>
      prisma.deployment.findUnique({ where: { id: deploymentId } }),
    null);

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    // 1. Mark the current deployment as rolled_back
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'rolled_back',
        completedAt: new Date(),
        deployLog: (deployment.deployLog || '') + `[${new Date().toISOString()}] Rolled back\n`,
      },
    }).catch(() => {});

    // 2. Find the previous successful deployment for the same environment
    const previous = await safePrisma(() =>
      prisma.deployment.findFirst({
        where: {
          workspaceId: deployment.workspaceId,
          organizationId: deployment.organizationId,
          environment: deployment.environment,
          status: 'live',
          id: { not: deploymentId },
        },
        orderBy: { createdAt: 'desc' },
      }),
    null);

    // 3. Create a new rollback deployment
    const rollbackDeployment = await prisma.deployment.create({
      data: {
        workspaceId: deployment.workspaceId,
        organizationId: deployment.organizationId,
        environment: deployment.environment,
        status: 'deploying',
        trigger: 'manual',
        rollbackFromId: previous?.id || null,
        branch: previous?.branch || deployment.branch,
        commitSha: previous?.commitSha || deployment.commitSha,
        triggeredBy: deployment.triggeredBy,
        startedAt: new Date(),
        deployLog: `[${new Date().toISOString()}] Rollback initiated${previous ? ` to deployment ${previous.id}` : ' (no previous live deployment found)'}\n`,
      },
    });

    return rollbackDeployment;
  },

  /**
   * Cancel a pending/building/deploying deployment.
   */
  async cancelDeployment(id: string) {
    return prisma.deployment.update({
      where: { id },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });
  },

  /**
   * Get deployment statistics for a workspace.
   *
   * Returns total count, counts by status, counts by environment,
   * success rate (live / total completed), and average duration
   * of completed deployments.
   */
  async getDeploymentStats(workspaceId: string): Promise<DeploymentStats> {
    const deployments = await safePrisma(() =>
      prisma.deployment.findMany({
        where: { workspaceId },
        select: {
          status: true,
          environment: true,
          startedAt: true,
          completedAt: true,
        },
      }),
    []);

    const total = deployments.length;

    const byStatus: Record<string, number> = {};
    const byEnvironment: Record<string, number> = {};

    let completed = 0;
    let succeeded = 0;
    let totalDurationMs = 0;
    let durationCount = 0;

    for (const d of deployments) {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      byEnvironment[d.environment] = (byEnvironment[d.environment] || 0) + 1;

      // Count completed deployments (those with a completedAt)
      if (d.completedAt) {
        completed++;
        if (d.status === 'live') succeeded++;

        if (d.startedAt && d.completedAt) {
          const duration = d.completedAt.getTime() - d.startedAt.getTime();
          if (duration >= 0) {
            totalDurationMs += duration;
            durationCount++;
          }
        }
      }
    }

    const successRate = completed > 0 ? Math.round((succeeded / completed) * 100) : 0;
    const avgDurationMs = durationCount > 0 ? Math.round(totalDurationMs / durationCount) : 0;

    return {
      total,
      byStatus,
      byEnvironment,
      successRate,
      avgDurationMs,
    };
  },

  /**
   * Get the current active (live) deployment for an environment.
   */
  async getActiveDeployment(workspaceId: string, environment: string) {
    return safePrisma(() =>
      prisma.deployment.findFirst({
        where: {
          workspaceId,
          environment,
          status: 'live',
        },
        orderBy: { completedAt: 'desc' },
      }),
    null);
  },

  /**
   * Link a deployment to a coding loop task and PR.
   *
   * Updates the deployment with the PR number and trigger source,
   * and records a link in the build log.
   */
  async linkToCodingLoop(deploymentId: string, taskId: string, prNumber: number) {
    const deployment = await safePrisma(() =>
      prisma.deployment.findUnique({ where: { id: deploymentId } }),
    null);

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    return prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        prNumber,
        trigger: 'coding_loop',
        buildLog: (deployment.buildLog || '') +
          `[${new Date().toISOString()}] Linked to coding loop task ${taskId} (PR #${prNumber})\n`,
      },
    });
  },
};
