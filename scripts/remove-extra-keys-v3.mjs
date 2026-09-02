/**
 * Remove extra keys from non-English locales that don't exist in English.
 * Uses JSON.stringify for proper serialization (same as sync-i18n.mjs).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '..', 'src', 'i18n', 'locales');

const enModule = await import(`file://${join(localesDir, 'en.ts')}`);
const enMessages = enModule.enMessages;
const enAppMessages = enModule.enAppMessages;

const locales = ['ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'th', 'vi', 'zh'];

function collectKeys(o, p = '') {
  let keys = new Set();
  for (const k in o) {
    if (typeof o[k] === 'object' && o[k] !== null && !Array.isArray(o[k])) {
      for (const sk of collectKeys(o[k], p + k + '.')) keys.add(sk);
    } else {
      keys.add(p + k);
    }
  }
  return keys;
}

function removeExtraKeys(enKeys, localeObj) {
  /** Remove keys from localeObj that don't exist in enKeys */
  function clean(obj, prefix) {
    let removed = 0;
    for (const k of Object.keys(obj)) {
      const fullKey = prefix + k;
      if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
        removed += clean(obj[k], fullKey + '.');
        // If the sub-object is now empty and the full key doesn't exist in English, remove it
        if (Object.keys(obj[k]).length === 0 && !enKeys.has(fullKey)) {
          delete obj[k];
          removed++;
        }
      } else if (!enKeys.has(fullKey)) {
        delete obj[k];
        removed++;
      }
    }
    return removed;
  }
  return clean(localeObj, '');
}

const enKeys = collectKeys(enMessages);

for (const locale of locales) {
  const mod = await import(`file://${join(localesDir, locale + '.ts')}`);
  const msgKey = `${locale}Messages`;
  const appKey = `${locale}AppMessages`;
  const messages = mod[msgKey];
  const appMessages = mod[appKey];

  // Deep clone to avoid modifying the module cache
  const cleanedMessages = JSON.parse(JSON.stringify(messages));
  const cleanedApp = JSON.parse(JSON.stringify(appMessages));

  const removedMsg = removeExtraKeys(enKeys, cleanedMessages);
  // App messages should already be in sync, but clean them too
  const enAppKeys = collectKeys(enAppMessages);
  const removedApp = removeExtraKeys(enAppKeys, cleanedApp);

  const totalRemoved = removedMsg + removedApp;
  if (totalRemoved === 0) {
    console.log(`${locale}: OK (no extra keys)`);
    continue;
  }

  console.log(`${locale}: removing ${removedMsg} message keys + ${removedApp} app keys`);

  // Serialize using JSON.stringify (same format as sync-i18n.mjs)
  const content = `// Auto-generated locale file for ${locale}\nexport const ${msgKey} = ${JSON.stringify(cleanedMessages, null, 2)};\n\nexport const ${appKey} = ${JSON.stringify(cleanedApp, null, 2)};\n`;

  writeFileSync(join(localesDir, locale + '.ts'), content);
}

console.log('\nDone!');
