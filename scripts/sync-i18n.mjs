/**
 * Sync missing i18n keys from English to all non-English locales.
 *
 * This script:
 * 1. Loads the English locale (enMessages + enAppMessages)
 * 2. Loads each non-English locale
 * 3. Deep-merges missing keys from English into each locale
 * 4. Writes the updated locale file back
 *
 * Missing keys are filled with the English value as a fallback.
 * Existing translations are preserved.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '..', 'src', 'i18n', 'locales');

// Load English locale as the source of truth
const enSource = readFileSync(join(localesDir, 'en.ts'), 'utf8');

// Extract the enMessages and enAppMessages objects using eval
// (safe here — we control the file content)
const enModule = await import(`file://${join(localesDir, 'en.ts')}`);
const enMessages = enModule.enMessages;
const enAppMessages = enModule.enAppMessages;

const locales = ['ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'th', 'vi', 'zh'];

function deepMerge(source, target) {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge(value, target[key] || {});
    } else if (!(key in target)) {
      // Missing key — add from English
      result[key] = value;
    }
  }
  return result;
}

function countKeys(obj) {
  let count = 0;
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      count += countKeys(v);
    } else {
      count++;
    }
  }
  return count;
}

let totalAdded = 0;

for (const locale of locales) {
  const mod = await import(`file://${join(localesDir, `${locale}.ts`)}`);
  const msgKey = `${locale}Messages`;
  const appKey = `${locale}AppMessages`;
  const origMessages = mod[msgKey];
  const origApp = mod[appKey];

  const beforeMsg = countKeys(origMessages);
  const beforeApp = countKeys(origApp);

  const mergedMessages = deepMerge(enMessages, origMessages);
  const mergedApp = deepMerge(enAppMessages, origApp);

  const afterMsg = countKeys(mergedMessages);
  const afterApp = countKeys(mergedApp);

  const addedMsg = afterMsg - beforeMsg;
  const addedApp = afterApp - beforeApp;
  const added = addedMsg + addedApp;
  totalAdded += added;

  if (added === 0) {
    console.log(`${locale}: already complete (0 keys added)`);
    continue;
  }

  // Serialize back to TypeScript
  const content = `// Auto-generated locale file for ${locale}\nexport const ${msgKey} = ${JSON.stringify(mergedMessages, null, 2)};\n\nexport const ${appKey} = ${JSON.stringify(mergedApp, null, 2)};\n`;

  writeFileSync(join(localesDir, `${locale}.ts`), content);
  console.log(`${locale}: added ${addedMsg} message keys + ${addedApp} app message keys = ${added} total (was ${beforeMsg + beforeApp}, now ${afterMsg + afterApp})`);
}

console.log(`\nTotal keys added across all locales: ${totalAdded}`);
