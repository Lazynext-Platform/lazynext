import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

const execAsync = promisify(exec);

// ── Types ──

export type SandboxLanguage = 'javascript' | 'typescript' | 'python' | 'shell';
export type SandboxRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';

export interface SandboxRunInput {
  language: SandboxLanguage;
  code: string;
  timeoutSec?: number;
  agentRunId?: string;
  taskId?: string;
}

export interface SandboxExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface SandboxStats {
  total: number;
  byStatus: Record<string, number>;
  byLanguage: Record<string, number>;
  successRate: number;
  avgDurationMs: number;
}

export interface SandboxQuotaCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

// ── Constants ──

const DEFAULT_TIMEOUT_SEC = 30;
const MAX_TIMEOUT_SEC = 60;
const DEFAULT_DAILY_LIMIT = 50;
const TMP_DIR = '/tmp';

// ── Sandbox Service ──

export const SandboxService = {
  /**
   * List sandbox runs for a workspace, optionally filtered by status.
   */
  async listRuns(
    workspaceId: string,
    opts?: { status?: SandboxRunStatus; take?: number },
  ) {
    const take = Math.min(opts?.take ?? 100, 500);
    return safePrisma(() =>
      prisma.sandboxRun.findMany({
        where: {
          workspaceId,
          ...(opts?.status && { status: opts.status }),
        },
        orderBy: { createdAt: 'desc' },
        take,
      }),
    []);
  },

  /**
   * Get a single sandbox run by ID.
   */
  async getRun(id: string) {
    return safePrisma(() => prisma.sandboxRun.findUnique({ where: { id } }), null);
  },

  /**
   * Create a sandbox run record (without executing).
   */
  async createRun(workspaceId: string, input: SandboxRunInput) {
    const timeoutSec = Math.min(Math.max(input.timeoutSec ?? DEFAULT_TIMEOUT_SEC, 1), MAX_TIMEOUT_SEC);
    return prisma.sandboxRun.create({
      data: {
        workspaceId,
        agentRunId: input.agentRunId || null,
        taskId: input.taskId || null,
        language: input.language,
        code: input.code.slice(0, 100000),
        status: 'pending',
        timeoutSec,
      },
    });
  },

  /**
   * Execute code in an isolated sandbox.
   *
   * IMPORTANT: This is a local-dev sandbox that runs code via child_process.
   * In production, this would use Docker containers or isolated-vm for proper
   * isolation and resource limits. Do NOT use this in production as-is.
   */
  async executeCode(input: SandboxRunInput): Promise<SandboxExecutionResult> {
    const timeoutSec = Math.min(Math.max(input.timeoutSec ?? DEFAULT_TIMEOUT_SEC, 1), MAX_TIMEOUT_SEC);
    const timeoutMs = timeoutSec * 1000;
    const start = Date.now();

    const ext = input.language === 'typescript' ? '.ts'
      : input.language === 'python' ? '.py'
      : input.language === 'shell' ? '.sh'
      : '.js';
    const tmpFile = join(TMP_DIR, `sandbox-${randomUUID()}${ext}`);

    let command: string;
    switch (input.language) {
      case 'javascript':
        command = `node ${tmpFile}`;
        break;
      case 'typescript':
        command = `npx tsx ${tmpFile}`;
        break;
      case 'python':
        command = `python3 ${tmpFile}`;
        break;
      case 'shell':
        command = `bash ${tmpFile}`;
        break;
      default:
        return {
          stdout: '',
          stderr: `unsupported_language: ${input.language}`,
          exitCode: 1,
          durationMs: 0,
        };
    }

    try {
      // Ensure /tmp exists
      await mkdir(TMP_DIR, { recursive: true });
      await writeFile(tmpFile, input.code, 'utf-8');

      let stdout = '';
      let stderr = '';
      let exitCode = 0;

      try {
        const result = await execAsync(command, {
          timeout: timeoutMs,
          maxBuffer: 1024 * 1024 * 10, // 10MB
          cwd: TMP_DIR,
        });
        stdout = result.stdout || '';
        stderr = result.stderr || '';
        exitCode = 0;
      } catch (e) {
        const err = e as { stdout?: string; stderr?: string; code?: number | string; killed?: boolean; signal?: string };
        stdout = err.stdout || '';
        stderr = err.stderr || '';
        if (err.killed || err.signal === 'SIGTERM') {
          // Timeout
          stderr = stderr + (stderr ? '\n' : '') + `Execution timed out after ${timeoutSec}s`;
          exitCode = 124; // standard timeout exit code
        } else {
          exitCode = typeof err.code === 'number' ? err.code : 1;
        }
      }

      const durationMs = Date.now() - start;

      return {
        stdout: stdout.slice(0, 100000),
        stderr: stderr.slice(0, 100000),
        exitCode,
        durationMs,
      };
    } catch (e) {
      const durationMs = Date.now() - start;
      return {
        stdout: '',
        stderr: e instanceof Error ? e.message : 'execution_error',
        exitCode: 1,
        durationMs,
      };
    } finally {
      // Clean up temp file (best-effort)
      try {
        await unlink(tmpFile);
      } catch {
        // ignore
      }
    }
  },

  /**
   * Create a sandbox run record AND execute the code, updating the record
   * with results. Returns the full run.
   */
  async run(workspaceId: string, input: SandboxRunInput) {
    const record = await this.createRun(workspaceId, input);

    // Mark as running
    await safePrisma(() =>
      prisma.sandboxRun.update({
        where: { id: record.id },
        data: { status: 'running' },
      }),
    null);

    const result = await this.executeCode(input);

    const status: SandboxRunStatus =
      result.exitCode === 124 ? 'timeout'
      : result.exitCode === 0 ? 'completed'
      : 'failed';

    const updated = await safePrisma(() =>
      prisma.sandboxRun.update({
        where: { id: record.id },
        data: {
          status,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          durationMs: result.durationMs,
          completedAt: new Date(),
          ...(status === 'timeout' && { error: `Execution timed out after ${input.timeoutSec ?? DEFAULT_TIMEOUT_SEC}s` }),
        },
      }),
    { ...record, status, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, durationMs: result.durationMs, completedAt: new Date() });

    return updated;
  },

  /**
   * Cancel a sandbox run (best-effort, since exec may already be running).
   * Marks the record as cancelled.
   */
  async cancelRun(id: string) {
    const existing = await this.getRun(id);
    if (!existing) return null;
    if (['completed', 'failed', 'timeout', 'cancelled'].includes(existing.status)) {
      return existing;
    }

    return safePrisma(() =>
      prisma.sandboxRun.update({
        where: { id },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
          error: 'cancelled_by_user',
        },
      }),
    { ...existing, status: 'cancelled', completedAt: new Date(), error: 'cancelled_by_user' });
  },

  /**
   * Get sandbox execution stats for a workspace.
   */
  async getStats(workspaceId: string): Promise<SandboxStats> {
    const runs = await safePrisma(() =>
      prisma.sandboxRun.findMany({
        where: { workspaceId },
        select: { status: true, language: true, durationMs: true },
        take: 1000,
      }),
    []);

    const byStatus: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};
    let successCount = 0;
    let durationSum = 0;
    let durationCount = 0;

    for (const r of runs) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byLanguage[r.language] = (byLanguage[r.language] || 0) + 1;
      if (r.status === 'completed') successCount++;
      if (r.durationMs != null) {
        durationSum += r.durationMs;
        durationCount++;
      }
    }

    const total = runs.length;
    const successRate = total > 0 ? (successCount / total) * 100 : 0;
    const avgDurationMs = durationCount > 0 ? Math.round(durationSum / durationCount) : 0;

    return {
      total,
      byStatus,
      byLanguage,
      successRate,
      avgDurationMs,
    };
  },

  /**
   * Check if a workspace has exceeded its daily sandbox run limit.
   * Uses the WorkspaceQuota model (default 50/day).
   */
  async checkQuota(workspaceId: string): Promise<SandboxQuotaCheck> {
    // Fetch quota record
    const quota = await safePrisma(() =>
      prisma.workspaceQuota.findUnique({
        where: { workspaceId },
        select: { maxSandboxRunsPerDay: true },
      }),
    null);

    const limit = quota?.maxSandboxRunsPerDay ?? DEFAULT_DAILY_LIMIT;

    // Count runs created today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const used = await safePrisma(() =>
      prisma.sandboxRun.count({
        where: {
          workspaceId,
          createdAt: { gte: startOfDay },
        },
      }),
    0);

    return {
      allowed: used < limit,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  },
};
