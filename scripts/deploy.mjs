#!/usr/bin/env node
// Production deployment script for Lazynext
// Runs build, deploy, and health check in sequence

import { execSync } from 'child_process';

const steps = [
  { name: 'Lint', cmd: 'npm run lint' },
  { name: 'Test', cmd: 'npm test' },
  { name: 'CF Build', cmd: 'npm run cf:build' },
  { name: 'CF Deploy', cmd: 'npm run cf:deploy' },
];

for (const step of steps) {
  console.log(`\n▶ Running ${step.name}...`);
  try {
    execSync(step.cmd, { stdio: 'inherit', timeout: 600000 });
    console.log(`✓ ${step.name} passed`);
  } catch (err) {
    console.error(`✗ ${step.name} failed`);
    process.exit(1);
  }
}

console.log('\n✅ Deployment complete!');
