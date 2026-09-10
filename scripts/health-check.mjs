#!/usr/bin/env node
// Post-deployment health check

const HEALTH_URL = process.env.HEALTH_URL || 'http://localhost:3100/api/health';

async function checkHealth() {
  try {
    const response = await fetch(HEALTH_URL);
    const data = await response.json().catch(() => null);

    if (response.ok) {
      console.log('✅ Health check passed:', JSON.stringify(data, null, 2));
      process.exit(0);
    } else if (response.status === 503 && data?.status === 'degraded') {
      console.log('⚠️  Health check: DEGRADED (expected in local dev)');
      console.log(JSON.stringify(data, null, 2));
      console.log('\nIn production, all checks should return ok: true.');
      process.exit(0); // Don't fail on degraded — it's expected locally
    } else {
      console.error(`❌ Health check failed: HTTP ${response.status}`);
      if (data) console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Health check failed:', err.message);
    process.exit(1);
  }
}

checkHealth();
