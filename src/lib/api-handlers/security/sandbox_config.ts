import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  getSandboxConfig,
  getSandboxRecommendation,
  validateSandboxConfig,
} from '@/lib/security/sandbox-isolation';

/**
 * GET /api/security/sandbox-config — get the sandbox isolation config and
 * recommendation for the current environment.
 */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const environment = process.env.NODE_ENV || process.env.BUILD_TARGET || 'development';
    const config = getSandboxConfig(environment);
    const recommendation = getSandboxRecommendation();
    const validation = validateSandboxConfig(config);

    return NextResponse.json({
      environment,
      config,
      validation,
      recommendation,
    });
  } catch (e) {
    console.error('[security/sandbox-config] error:', e);
    return NextResponse.json({ error: 'failed_to_get_sandbox_config' }, { status: 500 });
  }
}
