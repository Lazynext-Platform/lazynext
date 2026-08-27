// Custom Node.js loader to resolve @/ path aliases in test files.
// This allows tests to import application modules like:
//   import { foo } from '@/lib/brand/fetch';
// by resolving @/ to ./src/ relative to the project root.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { resolve as resolvePath } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolvePath(__dirname, '..');

export async function resolve(specifier, context, nextResolve) {
  // Resolve @/ alias to ./src/
  if (specifier.startsWith('@/')) {
    const resolvedPath = join(projectRoot, 'src', specifier.slice(2));
    return nextResolve(pathToFileURL(resolvedPath + '.ts').href, context);
  }
  return nextResolve(specifier, context);
}
