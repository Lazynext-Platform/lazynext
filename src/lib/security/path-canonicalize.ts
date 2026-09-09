/**
 * Path Canonicalization Utility — safe filesystem path handling.
 *
 * Prevents path-traversal attacks by resolving and canonicalizing paths
 * relative to a trusted base directory. All filesystem tool executors
 * should route user-supplied paths through `getSafePath` before any
 * file operation.
 *
 * Key protections:
 * - Resolves `..`, `.`, and symlinks to prevent traversal outside the base
 * - Rejects null bytes (poisoned paths)
 * - Verifies the resolved path is contained within the basePath
 * - Returns null / throws for unsafe paths instead of performing the operation
 */

import { resolve, normalize, isAbsolute, sep, join } from 'node:path';

// ── Errors ──

export class PathTraversalError extends Error {
  readonly code = 'PATH_TRAVERSAL_DETECTED';
  readonly inputPath: string;
  readonly basePath: string;

  constructor(inputPath: string, basePath: string) {
    super(`Path traversal detected: "${inputPath}" escapes base "${basePath}"`);
    this.name = 'PathTraversalError';
    this.inputPath = inputPath;
    this.basePath = basePath;
  }
}

// ── Helpers ──

/**
 * Ensure a base path ends with a separator so that containment checks
 * don't match sibling directories that share a prefix
 * (e.g. base `/tmp/foo` should NOT contain `/tmp/foo-bar/secret`).
 */
function withTrailingSep(p: string): string {
  return p.endsWith(sep) ? p : p + sep;
}

/**
 * Canonicalize a path relative to a base directory.
 *
 * - Resolves `..`, `.`, and symlinks (lexically via path.resolve/normalize)
 * - Verifies the resolved path is within the basePath
 * - Returns the canonicalized absolute path, or null if unsafe / invalid
 *
 * Edge cases handled:
 * - Empty / whitespace-only paths → null
 * - Null bytes → null
 * - Absolute paths that escape the base → null
 * - Absolute paths within the base → resolved (still must be inside base)
 */
export function canonicalizePath(inputPath: string, basePath: string): string | null {
  // Reject empty / null-ish input
  if (!inputPath || typeof inputPath !== 'string' || inputPath.trim() === '') {
    return null;
  }

  // Reject null bytes (poisoned paths used to bypass prefix checks)
  if (inputPath.includes('\0')) {
    return null;
  }

  // Reject null bytes in the base too
  if (!basePath || basePath.includes('\0')) {
    return null;
  }

  // Resolve the base to an absolute, normalized path
  const resolvedBase = resolve(normalize(basePath));

  // Resolve the input. If absolute, it stays absolute; otherwise it is
  // resolved relative to the base (the trusted root).
  const resolvedInput = isAbsolute(inputPath)
    ? resolve(normalize(inputPath))
    : resolve(resolvedBase, normalize(inputPath));

  // Containment check: the resolved input must equal the base OR be a
  // descendant of it. We compare with trailing separators to avoid the
  // prefix-collision problem (e.g. /tmp/foo vs /tmp/foo-bar).
  if (resolvedInput === resolvedBase) {
    return resolvedBase;
  }

  const baseWithSep = withTrailingSep(resolvedBase);
  if (!resolvedInput.startsWith(baseWithSep)) {
    return null;
  }

  return resolvedInput;
}

/**
 * Boolean check: is the given input path safely contained within basePath?
 */
export function isPathSafe(inputPath: string, basePath: string): boolean {
  return canonicalizePath(inputPath, basePath) !== null;
}

/**
 * Returns the canonicalized path or throws `PathTraversalError` if unsafe.
 *
 * Use this in tool executors / API handlers where an unsafe path should
 * abort the operation with a clear error rather than silently returning null.
 */
export function getSafePath(inputPath: string, basePath: string): string {
  const safe = canonicalizePath(inputPath, basePath);
  if (safe === null) {
    throw new PathTraversalError(inputPath, basePath);
  }
  return safe;
}

/**
 * Sanitize a filename (single path component) by removing characters that
 * could be used for traversal or path manipulation:
 * - `..` sequences
 * - path separators (`/`, `\`)
 * - null bytes
 * - control characters
 *
 * Returns the sanitized filename. If the result is empty, returns a safe
 * fallback so downstream code never receives a blank name.
 */
export function sanitizeFilename(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'untitled';
  }

  let cleaned = name;

  // Remove null bytes
  cleaned = cleaned.replace(/\0/g, '');

  // Remove path separators (both POSIX and Windows)
  cleaned = cleaned.replace(/[\\/]/g, '');

  // Remove leading dots to neutralize `..` and hidden-traversal tricks
  cleaned = cleaned.replace(/^\.+/, '');

  // Collapse any remaining `..` sequences
  cleaned = cleaned.replace(/\.\./g, '');

  // Strip control characters
  cleaned = cleaned.replace(/[\x00-\x1f\x7f]/g, '');

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned || 'untitled';
}

/**
 * Detect whether a path contains traversal / escape patterns.
 *
 * Returns true if the path:
 * - Contains `..` segments
 * - Is an absolute path (potential escape from a relative base)
 * - Contains null bytes
 * - Contains backslash-based traversal (Windows-style)
 */
export function detectPathTraversal(inputPath: string): boolean {
  if (!inputPath || typeof inputPath !== 'string') {
    return false;
  }

  // Null bytes are always suspicious
  if (inputPath.includes('\0')) {
    return true;
  }

  // Absolute path — may escape a relative base
  if (isAbsolute(inputPath)) {
    return true;
  }

  // Segment-level `..` detection (split on both separators)
  const segments = inputPath.split(/[\\/]/);
  if (segments.some((seg) => seg === '..')) {
    return true;
  }

  return false;
}

// ── Workspace base path ──

/**
 * Return the safe base directory for a workspace's files.
 *
 * - Locally (BUILD_TARGET=local / NODE_ENV != production): files live under
 *   `.dev-media/{workspaceId}` relative to the project root.
 * - In production: files are scoped to a Cloudflare R2 prefix
 *   `workspaces/{workspaceId}/` (configured via R2_WORKSPACE_PREFIX env).
 *
 * The returned path always ends WITHOUT a trailing separator so callers can
 * `join()` it with a relative filename safely.
 */
export function getWorkspaceBasePath(workspaceId: string): string {
  const sanitized = sanitizeFilename(workspaceId);

  const isProduction = process.env.NODE_ENV === 'production'
    || process.env.BUILD_TARGET === 'cloudflare';

  if (isProduction) {
    const prefix = process.env.R2_WORKSPACE_PREFIX || 'workspaces';
    return `${prefix}/${sanitized}`;
  }

  return join('.dev-media', sanitized);
}
