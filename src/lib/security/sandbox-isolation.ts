/**
 * Production Sandbox Isolation Design
 *
 * Defines the isolation levels, configuration, and command formatting for
 * running untrusted agent code safely. The current local-dev sandbox
 * (`src/lib/services/sandbox.ts`) runs code via `child_process.exec` with no
 * real isolation — this module documents the upgrade path to process,
 * container, WASM, and VM-level isolation for production.
 *
 * This module is design + interface only: `formatSandboxCommand` returns the
 * command string that *would* be executed; it does NOT execute anything.
 */

import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

// ── Types ──

export type SandboxIsolationLevel = 'none' | 'process' | 'container' | 'vm' | 'wasm';

export type SandboxLanguage = 'javascript' | 'typescript' | 'python' | 'shell';

export interface SandboxIsolationConfig {
  /** Isolation level — determines the execution boundary. */
  isolationLevel: SandboxIsolationLevel;
  /** Maximum execution time in seconds. */
  timeoutSec: number;
  /** Maximum memory in megabytes. */
  memoryLimitMb: number;
  /** Maximum CPU cores (fractional allowed, e.g. 0.5). */
  cpuLimit: number;
  /** Whether outbound network access is permitted. */
  networkAccess: boolean;
  /** Whether to mount a read-only filesystem (writes only to /tmp). */
  readOnlyFilesystem: boolean;
  /** Maximum output size in bytes (stdout + stderr). */
  maxOutputBytes: number;
  /** Docker image to use for container isolation (if applicable). */
  containerImage?: string;
  /** Working directory inside the sandbox. */
  workDir: string;
}

// ── Default configs ──

/**
 * Default production sandbox config.
 * - Container-level isolation (Docker)
 * - No network access
 * - 256 MB memory limit
 * - 30s timeout
 * - Read-only root filesystem, writes only to /tmp
 */
export const ProductionSandboxConfig: SandboxIsolationConfig = {
  isolationLevel: 'container',
  timeoutSec: 30,
  memoryLimitMb: 256,
  cpuLimit: 1,
  networkAccess: false,
  readOnlyFilesystem: true,
  maxOutputBytes: 10 * 1024 * 1024, // 10 MB
  containerImage: 'lazynext/sandbox-runtime:latest',
  workDir: '/sandbox',
};

/**
 * Local development sandbox config — process-level (current behavior).
 */
export const LocalSandboxConfig: SandboxIsolationConfig = {
  isolationLevel: 'process',
  timeoutSec: 30,
  memoryLimitMb: 512,
  cpuLimit: 1,
  networkAccess: true,
  readOnlyFilesystem: false,
  maxOutputBytes: 10 * 1024 * 1024,
  workDir: '/tmp',
};

// ── Config selection ──

/**
 * Return the appropriate sandbox config based on the runtime environment.
 *
 * - 'production' / 'cloudflare' → container isolation (ProductionSandboxConfig)
 * - 'development' / 'local' / 'test' → process isolation (LocalSandboxConfig)
 * - unknown → safest (production) defaults
 */
export function getSandboxConfig(environment?: string): SandboxIsolationConfig {
  const env = (environment || process.env.NODE_ENV || process.env.BUILD_TARGET || '').toLowerCase();

  if (env === 'production' || env === 'cloudflare' || env === 'prod') {
    return { ...ProductionSandboxConfig };
  }

  if (env === 'development' || env === 'dev' || env === 'local' || env === 'test') {
    return { ...LocalSandboxConfig };
  }

  // Unknown environment — default to safest (production) config
  return { ...ProductionSandboxConfig };
}

// ── Validation ──

export interface SandboxConfigValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a sandbox config. Returns a list of errors (empty if valid).
 */
export function validateSandboxConfig(config: SandboxIsolationConfig): SandboxConfigValidation {
  const errors: string[] = [];

  const validLevels: SandboxIsolationLevel[] = ['none', 'process', 'container', 'vm', 'wasm'];
  if (!validLevels.includes(config.isolationLevel)) {
    errors.push(`invalid isolationLevel: ${config.isolationLevel}`);
  }

  if (!Number.isFinite(config.timeoutSec) || config.timeoutSec <= 0) {
    errors.push('timeoutSec must be a positive number');
  }
  if (config.timeoutSec > 300) {
    errors.push('timeoutSec must not exceed 300 seconds');
  }

  if (!Number.isFinite(config.memoryLimitMb) || config.memoryLimitMb <= 0) {
    errors.push('memoryLimitMb must be a positive number');
  }
  if (config.memoryLimitMb > 4096) {
    errors.push('memoryLimitMb must not exceed 4096 MB');
  }

  if (!Number.isFinite(config.cpuLimit) || config.cpuLimit <= 0) {
    errors.push('cpuLimit must be a positive number');
  }
  if (config.cpuLimit > 16) {
    errors.push('cpuLimit must not exceed 16 cores');
  }

  if (!Number.isFinite(config.maxOutputBytes) || config.maxOutputBytes <= 0) {
    errors.push('maxOutputBytes must be a positive number');
  }

  if (typeof config.networkAccess !== 'boolean') {
    errors.push('networkAccess must be a boolean');
  }

  if (typeof config.readOnlyFilesystem !== 'boolean') {
    errors.push('readOnlyFilesystem must be a boolean');
  }

  if (!config.workDir || config.workDir.trim() === '') {
    errors.push('workDir must not be empty');
  }

  // Container isolation requires an image
  if (config.isolationLevel === 'container' && !config.containerImage) {
    errors.push('containerImage is required when isolationLevel is "container"');
  }

  // Production should not use 'none' or 'process' isolation
  const env = (process.env.NODE_ENV || '').toLowerCase();
  if (env === 'production' && (config.isolationLevel === 'none' || config.isolationLevel === 'process')) {
    errors.push(`isolationLevel "${config.isolationLevel}" is not safe for production`);
  }

  return { valid: errors.length === 0, errors };
}

// ── Command formatting ──

/**
 * Format the command that would run `code` in the sandbox based on the
 * isolation level. Does NOT execute anything — returns the command string.
 *
 * - 'process': uses child_process.exec (current local-dev behavior)
 * - 'container': formats a `docker run` command with resource limits
 * - 'wasm': formats a WASM runtime command
 * - 'vm' / 'none': returns a descriptive placeholder
 */
export function formatSandboxCommand(
  code: string,
  language: SandboxLanguage,
  config: SandboxIsolationConfig,
): string {
  const fileId = randomUUID();
  const ext = language === 'typescript' ? '.ts'
    : language === 'python' ? '.py'
    : language === 'shell' ? '.sh'
    : '.js';
  const fileName = `sandbox-${fileId}${ext}`;
  const filePath = join(config.workDir, fileName);

  switch (config.isolationLevel) {
    case 'process':
      return formatProcessCommand(code, language, filePath, config);

    case 'container':
      return formatContainerCommand(code, language, filePath, config);

    case 'wasm':
      return formatWasmCommand(code, language, filePath, config);

    case 'vm':
      return formatVmCommand(code, language, filePath, config);

    case 'none':
    default:
      return `# WARNING: no isolation configured — code would run directly\n# language=${language} file=${filePath}`;
  }
}

function formatProcessCommand(
  _code: string,
  language: SandboxLanguage,
  filePath: string,
  config: SandboxIsolationConfig,
): string {
  const runner = languageRunner(language, filePath);
  const timeoutFlag = config.timeoutSec > 0 ? `timeout ${config.timeoutSec}` : '';
  return [timeoutFlag, runner].filter(Boolean).join(' ');
}

function formatContainerCommand(
  _code: string,
  language: SandboxLanguage,
  filePath: string,
  config: SandboxIsolationConfig,
): string {
  const image = config.containerImage || 'lazynext/sandbox-runtime:latest';
  const runner = languageRunner(language, filePath);

  const flags: string[] = [
    'docker run --rm',
    `--memory=${config.memoryLimitMb}m`,
    `--cpus=${config.cpuLimit}`,
    `--timeout=${config.timeoutSec}`,
  ];

  if (!config.networkAccess) {
    flags.push('--network=none');
  }

  if (config.readOnlyFilesystem) {
    flags.push('--read-only');
    flags.push('--tmpfs /tmp:rw,size=${memoryLimitMb}m');
  }

  flags.push(`--workdir ${config.workDir}`);
  flags.push(image);
  flags.push(runner);

  return flags.join(' ');
}

function formatWasmCommand(
  _code: string,
  language: SandboxLanguage,
  filePath: string,
  config: SandboxIsolationConfig,
): string {
  // WASM runtime (e.g. wasmtime / wasmer) — no network, memory-limited
  const runtime = process.env.WASM_RUNTIME || 'wasmtime';
  const runner = language === 'python'
    ? `pyodide run ${filePath}`
    : language === 'shell'
      ? `wasm-sh ${filePath}`
      : `node --experimental-wasm ${filePath}`;

  return [
    runtime,
    `--max-memory ${config.memoryLimitMb}MB`,
    `--timeout ${config.timeoutSec}`,
    !config.networkAccess ? '--disable-network' : '',
    runner,
  ].filter(Boolean).join(' ');
}

function formatVmCommand(
  _code: string,
  language: SandboxLanguage,
  filePath: string,
  config: SandboxIsolationConfig,
): string {
  const runner = languageRunner(language, filePath);
  return [
    'firecracker --no-api',
    `--memory=${config.memoryLimitMb}`,
    `--cpu=${config.cpuLimit}`,
    `--timeout=${config.timeoutSec}`,
    !config.networkAccess ? '--no-net' : '',
    `--exec="${runner}"`,
  ].filter(Boolean).join(' ');
}

function languageRunner(language: SandboxLanguage, filePath: string): string {
  switch (language) {
    case 'javascript':
      return `node ${filePath}`;
    case 'typescript':
      return `npx tsx ${filePath}`;
    case 'python':
      return `python3 ${filePath}`;
    case 'shell':
      return `bash ${filePath}`;
    default:
      return `node ${filePath}`;
  }
}

// ── Recommendation ──

export interface SandboxRecommendation {
  recommendedLevel: SandboxIsolationLevel;
  reason: string;
  config: SandboxIsolationConfig;
}

/**
 * Return a recommendation for which isolation level to use based on the
 * current environment.
 *
 * - Production / Cloudflare → container (with WASM as a lighter alternative)
 * - Development / local → process (acceptable for local dev)
 * - Test → process
 */
export function getSandboxRecommendation(): SandboxRecommendation {
  const env = (process.env.NODE_ENV || process.env.BUILD_TARGET || '').toLowerCase();

  if (env === 'production' || env === 'cloudflare' || env === 'prod') {
    return {
      recommendedLevel: 'container',
      reason: 'Production requires container-level isolation with no network access and strict resource limits. WASM is a lighter alternative if container cold-start latency is unacceptable.',
      config: { ...ProductionSandboxConfig },
    };
  }

  if (env === 'test') {
    return {
      recommendedLevel: 'process',
      reason: 'Test environment can use process-level isolation for speed, but container isolation should be used for tests that execute untrusted code.',
      config: { ...LocalSandboxConfig },
    };
  }

  // development / local / unknown
  return {
    recommendedLevel: 'process',
    reason: 'Local development can use process-level isolation via child_process. Switch to container isolation before deploying to production.',
    config: { ...LocalSandboxConfig },
  };
}
