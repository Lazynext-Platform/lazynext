/**
 * Sandbox Service — provides isolated execution environments for code and browser automation.
 *
 * In production, this would use Cloudflare Workers isolates, Docker containers, or
 * a dedicated sandbox service. Locally, it uses Node.js child_process with restrictions.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
}

export interface SandboxConfig {
  timeoutMs: number;
  maxMemoryMb: number;
  allowedCommands: string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
}

export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  timeoutMs: 30_000,
  maxMemoryMb: 256,
  allowedCommands: ['node', 'npm', 'npx', 'git', 'ls', 'cat', 'echo', 'test'],
};

export const SandboxService = {
  /**
   * Execute code in an isolated sandbox.
   * Currently uses child_process with timeout and memory limits.
   * In production, this should use Cloudflare Workers isolates or containers.
   */
  async executeCode(
    code: string,
    language: 'javascript' | 'typescript' = 'javascript',
    config: Partial<SandboxConfig> = {},
  ): Promise<SandboxResult> {
    const cfg = { ...DEFAULT_SANDBOX_CONFIG, ...config };
    const startTime = Date.now();

    // Create a temporary directory for the sandbox
    const sandboxDir = join(tmpdir(), `lazynext-sandbox-${Date.now()}`);
    mkdirSync(sandboxDir, { recursive: true });

    try {
      const ext = language === 'typescript' ? '.mts' : '.mjs';
      const filename = `sandbox${ext}`;
      const filepath = join(sandboxDir, filename);

      // For TypeScript, strip types (simplified — in production use a proper compiler)
      const codeToRun =
        language === 'typescript'
          ? code
              .replace(/:\s*[A-Za-z<>\[\]|\s,]+(?=\s*[=,);])/g, '')
              .replace(/interface\s+\w+\s*\{[^}]*\}/g, '')
          : code;

      writeFileSync(filepath, codeToRun, 'utf-8');

      try {
        const output = execSync(`node ${filepath}`, {
          encoding: 'utf-8',
          timeout: cfg.timeoutMs,
          maxBuffer: 1024 * 1024, // 1MB
          cwd: sandboxDir,
          env: {
            ...process.env,
            ...cfg.environment,
            NODE_OPTIONS: `--max-old-space-size=${cfg.maxMemoryMb}`,
          },
        });

        return {
          success: true,
          stdout: output,
          stderr: '',
          exitCode: 0,
          durationMs: Date.now() - startTime,
          timedOut: false,
        };
      } catch (err) {
        const error = err as {
          stdout?: string;
          stderr?: string;
          status?: number;
          killed?: boolean;
        };
        return {
          success: false,
          stdout: error.stdout || '',
          stderr: error.stderr || (err as Error).message,
          exitCode: error.status ?? 1,
          durationMs: Date.now() - startTime,
          timedOut: error.killed === true,
        };
      }
    } finally {
      rmSync(sandboxDir, { recursive: true, force: true });
    }
  },

  /**
   * Execute a shell command in a sandbox.
   */
  async executeCommand(
    command: string,
    config: Partial<SandboxConfig> = {},
  ): Promise<SandboxResult> {
    const cfg = { ...DEFAULT_SANDBOX_CONFIG, ...config };
    const startTime = Date.now();

    // Check if command is allowed
    const cmdBase = command.split(' ')[0];
    if (!cfg.allowedCommands.includes(cmdBase)) {
      return {
        success: false,
        stdout: '',
        stderr: `Command "${cmdBase}" is not allowed. Allowed: ${cfg.allowedCommands.join(', ')}`,
        exitCode: 1,
        durationMs: Date.now() - startTime,
        timedOut: false,
      };
    }

    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        timeout: cfg.timeoutMs,
        maxBuffer: 1024 * 1024,
        cwd: cfg.workingDirectory,
        env: { ...process.env, ...cfg.environment },
      });

      return {
        success: true,
        stdout: output,
        stderr: '',
        exitCode: 0,
        durationMs: Date.now() - startTime,
        timedOut: false,
      };
    } catch (err) {
      const error = err as {
        stdout?: string;
        stderr?: string;
        status?: number;
        killed?: boolean;
      };
      return {
        success: false,
        stdout: error.stdout || '',
        stderr: error.stderr || (err as Error).message,
        exitCode: error.status ?? 1,
        durationMs: Date.now() - startTime,
        timedOut: error.killed === true,
      };
    }
  },

  /**
   * Fetch a URL with SSRF protection.
   * Uses isUrlSafe() to block private/internal IPs.
   */
  async fetchUrl(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      timeoutMs?: number;
    } = {},
  ): Promise<{
    success: boolean;
    status: number;
    body: string;
    headers: Record<string, string>;
  }> {
    // Import isUrlSafe lazily to avoid circular deps
    const { isUrlSafe } = await import('@/lib/security');

    if (!isUrlSafe(url)) {
      return {
        success: false,
        status: 0,
        body: 'URL blocked by SSRF protection',
        headers: {},
      };
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
        signal: AbortSignal.timeout(options.timeoutMs || 10_000),
      });

      const body = await response.text();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        success: response.ok,
        status: response.status,
        body,
        headers,
      };
    } catch (err) {
      return {
        success: false,
        status: 0,
        body: (err as Error).message,
        headers: {},
      };
    }
  },

  /**
   * Run tests in a sandbox.
   */
  async runTests(
    testCommand: string = 'npm test',
    config: Partial<SandboxConfig> = {},
  ): Promise<SandboxResult> {
    return this.executeCommand(testCommand, {
      ...config,
      timeoutMs: config.timeoutMs || 120_000, // 2 min default for tests
      allowedCommands: ['npm', 'node', 'npx'],
    });
  },
};
