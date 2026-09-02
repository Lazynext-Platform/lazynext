// Custom Node.js loader to resolve @/ path aliases and extensionless relative imports in test files.
// This allows tests to import application modules like:
//   import { foo } from '@/lib/brand/fetch';
// by resolving @/ to ./src/ relative to the project root.
// It also resolves relative imports without extensions (e.g. './router' -> './router.ts')
// so transitive imports within source files work under --experimental-strip-types.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { resolve as resolvePath } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolvePath(__dirname, '..');

export async function resolve(specifier, context, nextResolve) {
  // Resolve @/ alias to ./src/
  if (specifier.startsWith('@/')) {
    const resolvedPath = join(projectRoot, 'src', specifier.slice(2));
    return nextResolve(pathToFileURL(resolvedPath + '.ts').href, context);
  }

  // Resolve relative imports without extensions (e.g. './router' -> './router.ts')
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !specifier.endsWith('.ts') &&
    !specifier.endsWith('.js') &&
    !specifier.endsWith('.mjs') &&
    !specifier.endsWith('.json') &&
    context.parentURL
  ) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    const basePath = resolvePath(parentDir, specifier);
    if (existsSync(basePath + '.ts')) {
      return nextResolve(pathToFileURL(basePath + '.ts').href, context);
    }
    if (existsSync(basePath + '.js')) {
      return nextResolve(pathToFileURL(basePath + '.js').href, context);
    }
  }

  return nextResolve(specifier, context);
}
