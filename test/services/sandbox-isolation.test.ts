import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSandboxConfig,
  validateSandboxConfig,
  formatSandboxCommand,
  getSandboxRecommendation,
  ProductionSandboxConfig,
  LocalSandboxConfig,
  type SandboxIsolationConfig,
  type SandboxLanguage,
} from '@/lib/security/sandbox-isolation';

// Cast process.env to a writable record (NODE_ENV is typed read-only by TS).
const env = process.env as Record<string, string | undefined>;

// ─────────────────────────────────────────────────────────────────────────────
// getSandboxConfig
// ─────────────────────────────────────────────────────────────────────────────

describe('getSandboxConfig', () => {
  beforeEach(() => { delete env.NODE_ENV; delete env.BUILD_TARGET; });
  afterEach(() => { delete env.NODE_ENV; delete env.BUILD_TARGET; });

  it('returns container config for production', () => {
    const config = getSandboxConfig('production');
    assert.equal(config.isolationLevel, 'container');
    assert.equal(config.networkAccess, false);
    assert.equal(config.memoryLimitMb, 256);
    assert.equal(config.timeoutSec, 30);
  });

  it('returns container config for cloudflare', () => {
    const config = getSandboxConfig('cloudflare');
    assert.equal(config.isolationLevel, 'container');
  });

  it('returns process config for development', () => {
    const config = getSandboxConfig('development');
    assert.equal(config.isolationLevel, 'process');
    assert.equal(config.networkAccess, true);
  });

  it('returns process config for local', () => {
    const config = getSandboxConfig('local');
    assert.equal(config.isolationLevel, 'process');
  });

  it('returns process config for test', () => {
    const config = getSandboxConfig('test');
    assert.equal(config.isolationLevel, 'process');
  });

  it('defaults to production (safest) for unknown environment', () => {
    const config = getSandboxConfig('unknown-env');
    assert.equal(config.isolationLevel, 'container');
  });

  it('uses NODE_ENV when no argument is provided', () => {
    env.NODE_ENV = 'production';
    const config = getSandboxConfig();
    assert.equal(config.isolationLevel, 'container');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateSandboxConfig
// ─────────────────────────────────────────────────────────────────────────────

describe('validateSandboxConfig', () => {
  it('accepts a valid production config', () => {
    const result = validateSandboxConfig(ProductionSandboxConfig);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('accepts a valid local config', () => {
    const result = validateSandboxConfig(LocalSandboxConfig);
    assert.equal(result.valid, true);
  });

  it('rejects invalid isolationLevel', () => {
    const config: SandboxIsolationConfig = {
      ...ProductionSandboxConfig,
      isolationLevel: 'invalid' as never,
    };
    const result = validateSandboxConfig(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('invalid isolationLevel')));
  });

  it('rejects non-positive timeoutSec', () => {
    const config: SandboxIsolationConfig = { ...ProductionSandboxConfig, timeoutSec: 0 };
    const result = validateSandboxConfig(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('timeoutSec')));
  });

  it('rejects timeoutSec exceeding 300', () => {
    const config: SandboxIsolationConfig = { ...ProductionSandboxConfig, timeoutSec: 600 };
    const result = validateSandboxConfig(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('300')));
  });

  it('rejects container isolation without containerImage', () => {
    const config: SandboxIsolationConfig = { ...ProductionSandboxConfig, containerImage: undefined };
    const result = validateSandboxConfig(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('containerImage')));
  });

  it('rejects empty workDir', () => {
    const config: SandboxIsolationConfig = { ...ProductionSandboxConfig, workDir: '' };
    const result = validateSandboxConfig(config);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('workDir')));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatSandboxCommand
// ─────────────────────────────────────────────────────────────────────────────

describe('formatSandboxCommand', () => {
  const code = 'console.log("hello")';

  it('formats a process command for javascript', () => {
    const cmd = formatSandboxCommand(code, 'javascript', LocalSandboxConfig);
    assert.ok(cmd.includes('node'));
    assert.ok(cmd.includes('timeout'));
  });

  it('formats a process command for python', () => {
    const cmd = formatSandboxCommand(code, 'python', LocalSandboxConfig);
    assert.ok(cmd.includes('python3'));
  });

  it('formats a process command for shell', () => {
    const cmd = formatSandboxCommand(code, 'shell', LocalSandboxConfig);
    assert.ok(cmd.includes('bash'));
  });

  it('formats a container command with docker run', () => {
    const cmd = formatSandboxCommand(code, 'javascript', ProductionSandboxConfig);
    assert.ok(cmd.includes('docker run'));
    assert.ok(cmd.includes('--rm'));
    assert.ok(cmd.includes('--memory=256m'));
    assert.ok(cmd.includes('--network=none'));
    assert.ok(cmd.includes('--read-only'));
  });

  it('container command includes the image name', () => {
    const cmd = formatSandboxCommand(code, 'typescript', ProductionSandboxConfig);
    assert.ok(cmd.includes(ProductionSandboxConfig.containerImage!));
  });

  it('formats a wasm command', () => {
    const config: SandboxIsolationConfig = { ...ProductionSandboxConfig, isolationLevel: 'wasm' };
    const cmd = formatSandboxCommand(code, 'javascript', config);
    assert.ok(cmd.includes('wasm'));
    assert.ok(cmd.includes('--max-memory'));
  });

  it('formats a vm command', () => {
    const config: SandboxIsolationConfig = { ...ProductionSandboxConfig, isolationLevel: 'vm' };
    const cmd = formatSandboxCommand(code, 'javascript', config);
    assert.ok(cmd.includes('firecracker'));
  });

  it('returns a warning placeholder for none', () => {
    const config: SandboxIsolationConfig = { ...LocalSandboxConfig, isolationLevel: 'none' };
    const cmd = formatSandboxCommand(code, 'javascript', config);
    assert.ok(cmd.includes('WARNING'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSandboxRecommendation
// ─────────────────────────────────────────────────────────────────────────────

describe('getSandboxRecommendation', () => {
  beforeEach(() => { delete env.NODE_ENV; delete env.BUILD_TARGET; });
  afterEach(() => { delete env.NODE_ENV; delete env.BUILD_TARGET; });

  it('recommends container for production', () => {
    env.NODE_ENV = 'production';
    const rec = getSandboxRecommendation();
    assert.equal(rec.recommendedLevel, 'container');
    assert.ok(rec.reason.length > 0);
    assert.equal(rec.config.isolationLevel, 'container');
  });

  it('recommends process for development', () => {
    env.NODE_ENV = 'development';
    const rec = getSandboxRecommendation();
    assert.equal(rec.recommendedLevel, 'process');
    assert.ok(rec.reason.length > 0);
  });

  it('recommends process for test', () => {
    env.NODE_ENV = 'test';
    const rec = getSandboxRecommendation();
    assert.equal(rec.recommendedLevel, 'process');
  });

  it('includes a config object in the recommendation', () => {
    env.NODE_ENV = 'production';
    const rec = getSandboxRecommendation();
    assert.ok(rec.config);
    assert.equal(typeof rec.config.timeoutSec, 'number');
  });
});
