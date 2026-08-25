#!/usr/bin/env node
/**
 * Seed the studio preset reference images (product/avatar shots used by the
 * one-click "Remix this" recipes and the avatar dropdown) into the R2 media
 * bucket. The app serves them from /api/lazynext-studio/media/<key>.
 *
 * Source of truth: public/examples/marketing/reference/*.jpg (frames extracted
 * from the example videos, committed to the repo so any deployment can seed).
 *
 * Usage:
 *   node scripts/seed-example-media.mjs            # seed the remote bucket from wrangler.jsonc
 *   node scripts/seed-example-media.mjs --local    # seed the local preview bucket (wrangler dev / cf:preview)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REF_DIR = path.join(process.cwd(), 'public/examples/marketing/reference');
const BUCKET = 'lazynext-studio-media';
const local = process.argv.includes('--local');

const files = fs.readdirSync(REF_DIR).filter((f) => f.endsWith('.jpg'));
if (!files.length) {
  console.error(`No reference images found in ${REF_DIR}`);
  process.exit(1);
}

console.log(`Seeding ${files.length} reference images into ${BUCKET} (${local ? 'local' : 'remote'})…`);
let ok = 0;
for (const file of files) {
  const key = file; // media key == file name, e.g. prod-ugc.jpg
  execFileSync(
    'npx',
    ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', path.join(REF_DIR, file), '--content-type', 'image/jpeg', ...(local ? [] : ['--remote'])],
    { stdio: 'pipe' },
  );
  ok += 1;
  console.log(`  ✓ ${key}`);
}
console.log(`Done: ${ok}/${files.length} images seeded.`);
