/**
 * Convert non-English locale .ts files to static JSON files in public/locales/.
 * This externalizes ~4.5MB of locale data from the Cloudflare Worker bundle,
 * which is fetched at runtime instead of being inlined by the OpenNext bundler.
 *
 * Each output file: public/locales/{locale}.json
 * Contains: { "messages": {...}, "appMessages": {...} }
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const localesDir = join(projectRoot, 'src', 'i18n', 'locales');
const outDir = join(projectRoot, 'public', 'locales');

mkdirSync(outDir, { recursive: true });

const NON_EN_LOCALES = ['zh', 'ja', 'es', 'ko', 'pt', 'fr', 'de', 'ar', 'hi', 'vi', 'th', 'id'];

for (const locale of NON_EN_LOCALES) {
  const tsPath = join(localesDir, `${locale}.ts`);
  const src = readFileSync(tsPath, 'utf8');

  // Extract the two exported objects: {locale}Messages and {locale}AppMessages
  const messagesVar = `${locale}Messages`;
  const appMessagesVar = `${locale}AppMessages`;

  const messagesRegex = new RegExp(`export\\s+const\\s+${messagesVar}\\s*=\\s*(\\{[\\s\\S]*?\\});`);
  const appMessagesRegex = new RegExp(`export\\s+const\\s+${appMessagesVar}\\s*=\\s*(\\{[\\s\\S]*?\\});`);

  const msgMatch = src.match(messagesRegex);
  const appMsgMatch = src.match(appMessagesRegex);

  if (!msgMatch || !appMsgMatch) {
    console.error(`Failed to extract objects from ${locale}.ts`);
    console.error(`  messages match: ${!!msgMatch}, appMessages match: ${!!appMsgMatch}`);
    process.exit(1);
  }

  // The extracted strings are JS object literals with double-quoted keys/values — valid JSON
  const combined = {
    messages: JSON.parse(msgMatch[1]),
    appMessages: JSON.parse(appMsgMatch[1]),
  };

  const outPath = join(outDir, `${locale}.json`);
  writeFileSync(outPath, JSON.stringify(combined));
  console.log(`  wrote ${outPath} (${(JSON.stringify(combined).length / 1024).toFixed(0)} KB)`);
}

console.log(`\nDone: converted ${NON_EN_LOCALES.length} locale files to JSON`);
