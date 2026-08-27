// Patch eslint-plugin-react for eslint 10 compatibility.
// eslint 10 removed context.getFilename() in favor of context.filename.
// This script patches the installed eslint-plugin-react after npm install.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve('node_modules/eslint-plugin-react/lib/util/version.js');
if (!existsSync(target)) {
  console.log('[patch-eslint-plugin-react] target not found, skipping');
  process.exit(0);
}

let code = readFileSync(target, 'utf8');

// Check if already patched
if (code.includes('contextOrFilename.getFilename ? contextOrFilename.getFilename() : contextOrFilename.filename')) {
  console.log('[patch-eslint-plugin-react] already patched, skipping');
  process.exit(0);
}

// Replace: contextOrFilename.getFilename()
// With: (contextOrFilename.getFilename ? contextOrFilename.getFilename() : contextOrFilename.filename)
const original = 'contextOrFilename.getFilename()';
const patched = '(contextOrFilename.getFilename ? contextOrFilename.getFilename() : contextOrFilename.filename)';

if (code.includes(original)) {
  code = code.replace(original, patched);
  writeFileSync(target, code);
  console.log('[patch-eslint-plugin-react] patched successfully');
} else {
  console.log('[patch-eslint-plugin-react] pattern not found, skipping');
}
