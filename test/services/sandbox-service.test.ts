import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

// Mutable execSync implementation. execSync returns a string when `encoding` is
// set, or throws on failure (the thrown error carries stdout/stderr/status/killed).
let execSyncImpl: (command: string, options: Record<string, unknown>) => string =
  () => '';

// Mutable fs stubs — the sandbox writes a temp file before executing; since
// execSync is mocked we never need a real file on disk.
let writeFileSyncImpl: (path: string, data: string, encoding: string) => void =
  () => {};
let mkdirSyncImpl: (path: string, options: Record<string, unknown>) => void =
  () => {};
let rmSyncImpl: (path: string, options: Record<string, unknown>) => void =
  () => {};

// Mutable isUrlSafe implementation for SSRF protection tests.
let isUrlSafeImpl: (url: string) => boolean = () => true;

interface FetchCall {
  url: string;
  options?: RequestInit;
}

const fetchMock = {
  calls: [] as FetchCall[],
  implementation: null as
    | ((url: string, options?: RequestInit) => Promise<Response>)
    | null,
};

mock.module('node:child_process', {
  namedExports: {
    execSync: (command: string, options: Record<string, unknown>): string =>
      execSyncImpl(command, options),
  },
});

mock.module('node:fs', {
  namedExports: {
    writeFileSync: (path: string, data: string, encoding: string): void =>
      writeFileSyncImpl(path, data, encoding),
    mkdirSync: (path: string, options: Record<string, unknown>): void =>
      mkdirSyncImpl(path, options),
    rmSync: (path: string, options: Record<string, unknown>): void =>
      rmSyncImpl(path, options),
  },
});

mock.module('@/lib/security', {
  namedExports: {
    isUrlSafe: (url: string): boolean => isUrlSafeImpl(url),
  },
});

const originalFetch = globalThis.fetch;

function resetMock(): void {
  execSyncImpl = () => '';
  writeFileSyncImpl = () => {};
  mkdirSyncImpl = () => {};
  rmSyncImpl = () => {};
  isUrlSafeImpl = () => true;
  fetchMock.calls.length = 0;
  fetchMock.implementation = null;
  globalThis.fetch = originalFetch;
}

const { SandboxService } = await import('@/lib/services/sandbox-service');

// ─────────────────────────────────────────────────────────────────────────────
// SandboxService
// ─────────────────────────────────────────────────────────────────────────────

describe('SandboxService', () => {
  beforeEach(() => {
    resetMock();
  });

  describe('executeCode', () => {
    it('executes simple JavaScript and returns stdout', async () => {
      execSyncImpl = () => 'Hello World\n';

      const result = await SandboxService.executeCode(
        "console.log('Hello World')",
        'javascript',
      );

      assert.equal(result.success, true);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('Hello World'));
      assert.equal(result.stderr, '');
      assert.equal(result.timedOut, false);
      assert.ok(result.durationMs >= 0);
    });

    it('reports timeout when execSync is killed', async () => {
      execSyncImpl = () => {
        const err = new Error('Command killed') as Error & {
          stdout: string;
          stderr: string;
          status: number | null;
          killed: boolean;
        };
        err.stdout = '';
        err.stderr = '';
        err.status = null;
        err.killed = true;
        throw err;
      };

      const result = await SandboxService.executeCode(
        'while(true) {}',
        'javascript',
        { timeoutMs: 1 },
      );

      assert.equal(result.success, false);
      assert.equal(result.timedOut, true);
      assert.equal(result.exitCode, 1);
    });

    it('reports failure with stderr on non-zero exit', async () => {
      execSyncImpl = () => {
        const err = new Error('Command failed') as Error & {
          stdout: string;
          stderr: string;
          status: number;
        };
        err.stdout = '';
        err.stderr = 'SyntaxError: unexpected token';
        err.status = 1;
        throw err;
      };

      const result = await SandboxService.executeCode(
        'syntax error',
        'javascript',
      );

      assert.equal(result.success, false);
      assert.notEqual(result.exitCode, 0);
      assert.ok(result.stderr.includes('SyntaxError'));
    });
  });

  describe('executeCommand', () => {
    it('executes an allowed command and returns stdout', async () => {
      execSyncImpl = () => 'file.txt\n';

      const result = await SandboxService.executeCommand('ls');

      assert.equal(result.success, true);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('file.txt'));
    });

    it('blocks a disallowed command', async () => {
      const result = await SandboxService.executeCommand('rm -rf /');

      assert.equal(result.success, false);
      assert.equal(result.exitCode, 1);
      assert.ok(result.stderr.includes('not allowed'));
      assert.ok(result.stderr.includes('rm'));
      // execSync should never have been called for a blocked command
      assert.equal(result.timedOut, false);
    });

    it('reports failure on non-zero exit code', async () => {
      execSyncImpl = () => {
        const err = new Error('fail') as Error & {
          stdout: string;
          stderr: string;
          status: number;
        };
        err.stdout = '';
        err.stderr = 'not found';
        err.status = 127;
        throw err;
      };

      const result = await SandboxService.executeCommand('git status');

      assert.equal(result.success, false);
      assert.equal(result.exitCode, 127);
      assert.ok(result.stderr.includes('not found'));
    });
  });

  describe('fetchUrl', () => {
    it('fetches a safe URL and returns the body', async () => {
      isUrlSafeImpl = () => true;
      globalThis.fetch = ((url: string, options?: RequestInit) => {
        fetchMock.calls.push({ url, options });
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }) as typeof globalThis.fetch;

      const result = await SandboxService.fetchUrl('https://example.com/api');

      assert.equal(result.success, true);
      assert.equal(result.status, 200);
      assert.ok(result.body.includes('ok'));
      assert.equal(fetchMock.calls.length, 1);
      assert.equal(fetchMock.calls[0].url, 'https://example.com/api');
    });

    it('blocks an unsafe URL (private IP) without calling fetch', async () => {
      isUrlSafeImpl = () => false;
      let fetchCalled = false;
      globalThis.fetch = (() => {
        fetchCalled = true;
        return Promise.resolve(new Response('', { status: 200 }));
      }) as typeof globalThis.fetch;

      const result = await SandboxService.fetchUrl('http://127.0.0.1/secret');

      assert.equal(result.success, false);
      assert.equal(result.status, 0);
      assert.ok(result.body.includes('blocked'));
      assert.equal(fetchCalled, false);
    });

    it('returns failure when fetch throws', async () => {
      isUrlSafeImpl = () => true;
      globalThis.fetch = (() => {
        return Promise.reject(new Error('network error'));
      }) as typeof globalThis.fetch;

      const result = await SandboxService.fetchUrl('https://example.com/api');

      assert.equal(result.success, false);
      assert.equal(result.status, 0);
      assert.ok(result.body.includes('network error'));
    });
  });

  describe('runTests', () => {
    it('executes the test command with an extended timeout', async () => {
      let capturedOptions: Record<string, unknown> = {};
      execSyncImpl = (_cmd, options) => {
        capturedOptions = options;
        return 'all tests passed\n';
      };

      const result = await SandboxService.runTests();

      assert.equal(result.success, true);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('all tests passed'));
      // Default test timeout is 120s (120_000ms)
      assert.equal(capturedOptions.timeout, 120_000);
    });

    it('uses a custom test command', async () => {
      let capturedCommand = '';
      execSyncImpl = (cmd) => {
        capturedCommand = cmd;
        return 'done\n';
      };

      const result = await SandboxService.runTests('npm run test:unit');

      assert.equal(result.success, true);
      assert.equal(capturedCommand, 'npm run test:unit');
    });

    it('blocks a disallowed test command', async () => {
      const result = await SandboxService.runTests('rm -rf /');

      assert.equal(result.success, false);
      assert.ok(result.stderr.includes('not allowed'));
    });
  });
});
