import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

// Cast process.env to a writable record (NODE_ENV is typed read-only by TS).
const env = process.env as Record<string, string | undefined>;

import {
  canonicalizePath,
  isPathSafe,
  sanitizeFilename,
  getSafePath,
  detectPathTraversal,
  getWorkspaceBasePath,
  PathTraversalError,
} from '@/lib/security/path-canonicalize';

// ─────────────────────────────────────────────────────────────────────────────
// canonicalizePath
// ─────────────────────────────────────────────────────────────────────────────

describe('canonicalizePath', () => {
  it('resolves relative paths within the base', () => {
    const result = canonicalizePath('docs/readme.md', '/tmp/workspace');
    assert.equal(result, resolve('/tmp/workspace/docs/readme.md'));
  });

  it('resolves "." segments', () => {
    const result = canonicalizePath('./docs/./readme.md', '/tmp/workspace');
    assert.equal(result, resolve('/tmp/workspace/docs/readme.md'));
  });

  it('resolves ".." segments that stay within base', () => {
    const result = canonicalizePath('docs/../src/index.ts', '/tmp/workspace');
    assert.equal(result, resolve('/tmp/workspace/src/index.ts'));
  });

  it('returns null for traversal that escapes the base', () => {
    const result = canonicalizePath('../../etc/passwd', '/tmp/workspace');
    assert.equal(result, null);
  });

  it('returns null for nested traversal escaping the base', () => {
    const result = canonicalizePath('docs/../../etc/passwd', '/tmp/workspace');
    assert.equal(result, null);
  });

  it('handles absolute paths within the base', () => {
    const base = '/tmp/workspace';
    const result = canonicalizePath('/tmp/workspace/docs/readme.md', base);
    assert.equal(result, resolve('/tmp/workspace/docs/readme.md'));
  });

  it('returns null for absolute paths outside the base', () => {
    const result = canonicalizePath('/etc/passwd', '/tmp/workspace');
    assert.equal(result, null);
  });

  it('returns null for empty paths', () => {
    assert.equal(canonicalizePath('', '/tmp/workspace'), null);
    assert.equal(canonicalizePath('   ', '/tmp/workspace'), null);
  });

  it('rejects null bytes in the input path', () => {
    const result = canonicalizePath('docs\x00../../etc/passwd', '/tmp/workspace');
    assert.equal(result, null);
  });

  it('rejects null bytes in the base path', () => {
    const result = canonicalizePath('docs/readme.md', '/tmp\x00/workspace');
    assert.equal(result, null);
  });

  it('does not match sibling directories with shared prefix', () => {
    // /tmp/workspace-bar should NOT be considered inside /tmp/workspace
    const result = canonicalizePath('/tmp/workspace-bar/secret', '/tmp/workspace');
    assert.equal(result, null);
  });

  it('returns the base itself when input resolves to base', () => {
    const base = '/tmp/workspace';
    const result = canonicalizePath('.', base);
    assert.equal(result, resolve(base));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isPathSafe
// ─────────────────────────────────────────────────────────────────────────────

describe('isPathSafe', () => {
  it('returns true for safe paths within base', () => {
    assert.equal(isPathSafe('docs/readme.md', '/tmp/workspace'), true);
  });

  it('returns false for traversal paths', () => {
    assert.equal(isPathSafe('../../etc/passwd', '/tmp/workspace'), false);
  });

  it('returns false for empty paths', () => {
    assert.equal(isPathSafe('', '/tmp/workspace'), false);
  });

  it('returns false for null-byte paths', () => {
    assert.equal(isPathSafe('docs\x00/../etc', '/tmp/workspace'), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeFilename
// ─────────────────────────────────────────────────────────────────────────────

describe('sanitizeFilename', () => {
  it('removes path separators', () => {
    assert.equal(sanitizeFilename('foo/bar'), 'foo/bar'.replace(/[\\/]/g, ''));
    assert.equal(sanitizeFilename('foo\\bar'), 'foobar');
  });

  it('removes ".." sequences', () => {
    // ".." collapses to empty and falls back to 'untitled'
    assert.equal(sanitizeFilename('..'), 'untitled');
    assert.ok(sanitizeFilename('..').length > 0);
    assert.equal(sanitizeFilename('foo..bar'), 'foobar');
  });

  it('removes null bytes', () => {
    assert.equal(sanitizeFilename('foo\x00bar'), 'foobar');
  });

  it('removes leading dots', () => {
    assert.equal(sanitizeFilename('...hidden'), 'hidden');
  });

  it('returns untitled for empty or invalid input', () => {
    assert.equal(sanitizeFilename(''), 'untitled');
    assert.equal(sanitizeFilename('   '), 'untitled');
  });

  it('removes control characters', () => {
    assert.equal(sanitizeFilename('foo\x01\x02bar'), 'foobar');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSafePath
// ─────────────────────────────────────────────────────────────────────────────

describe('getSafePath', () => {
  it('returns the canonicalized path for safe paths', () => {
    const result = getSafePath('docs/readme.md', '/tmp/workspace');
    assert.equal(result, resolve('/tmp/workspace/docs/readme.md'));
  });

  it('throws PathTraversalError for unsafe paths', () => {
    assert.throws(
      () => getSafePath('../../etc/passwd', '/tmp/workspace'),
      (err: unknown) => err instanceof PathTraversalError,
    );
  });

  it('throws PathTraversalError for null-byte paths', () => {
    assert.throws(
      () => getSafePath('docs\x00/../etc', '/tmp/workspace'),
      (err: unknown) => err instanceof PathTraversalError,
    );
  });

  it('error contains input path and base path', () => {
    try {
      getSafePath('../../etc/passwd', '/tmp/workspace');
      assert.fail('should have thrown');
    } catch (e) {
      assert.ok(e instanceof PathTraversalError);
      assert.equal(e.inputPath, '../../etc/passwd');
      assert.equal(e.basePath, '/tmp/workspace');
      assert.equal(e.code, 'PATH_TRAVERSAL_DETECTED');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// detectPathTraversal
// ─────────────────────────────────────────────────────────────────────────────

describe('detectPathTraversal', () => {
  it('detects ".." segments', () => {
    assert.equal(detectPathTraversal('../../etc/passwd'), true);
    assert.equal(detectPathTraversal('docs/../src'), true);
  });

  it('detects absolute path escapes', () => {
    assert.equal(detectPathTraversal('/etc/passwd'), true);
  });

  it('detects null bytes', () => {
    assert.equal(detectPathTraversal('docs\x00/../etc'), true);
  });

  it('detects backslash traversal', () => {
    assert.equal(detectPathTraversal('docs\\..\\..\\etc'), true);
  });

  it('returns false for safe relative paths', () => {
    assert.equal(detectPathTraversal('docs/readme.md'), false);
    assert.equal(detectPathTraversal('src/index.ts'), false);
  });

  it('returns false for empty input', () => {
    assert.equal(detectPathTraversal(''), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getWorkspaceBasePath
// ─────────────────────────────────────────────────────────────────────────────

describe('getWorkspaceBasePath', () => {
  it('returns a .dev-media path in non-production', () => {
    const original = env.NODE_ENV;
    env.NODE_ENV = 'development';
    try {
      const result = getWorkspaceBasePath('ws-123');
      assert.ok(result.includes('ws-123'));
      assert.ok(result.includes('.dev-media'));
    } finally {
      env.NODE_ENV = original;
    }
  });

  it('returns an R2 prefix path in production', () => {
    const originalNodeEnv = env.NODE_ENV;
    const originalBuildTarget = env.BUILD_TARGET;
    env.NODE_ENV = 'production';
    delete env.BUILD_TARGET;
    try {
      const result = getWorkspaceBasePath('ws-123');
      assert.ok(result.includes('ws-123'));
      assert.ok(result.startsWith('workspaces/'));
    } finally {
      env.NODE_ENV = originalNodeEnv;
      env.BUILD_TARGET = originalBuildTarget;
    }
  });

  it('sanitizes the workspace id', () => {
    const original = env.NODE_ENV;
    env.NODE_ENV = 'development';
    try {
      const result = getWorkspaceBasePath('../etc');
      assert.ok(!result.includes('..'));
    } finally {
      env.NODE_ENV = original;
    }
  });
});
