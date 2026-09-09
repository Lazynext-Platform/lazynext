import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SsoService, SsoProvider } from '@/lib/services/sso-service';

const VALID_PROVIDERS: SsoProvider[] = ['saml', 'oidc', 'google', 'microsoft', 'okta', 'auth0'];

/** GET /api/security/sso/config — list SSO configs */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ configs: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const configs = await SsoService.listConfigs(organizationId);
  return NextResponse.json({ configs });
}

/** POST /api/security/sso/config — create or update SSO config */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const provider = String(body.provider || '') as SsoProvider;
  const name = String(body.name || '').trim();
  const domains = Array.isArray(body.domains) ? body.domains : [];

  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'invalid_provider' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    // Check if config already exists (update) or create new
    const existing = await SsoService.listConfigs(organizationId);
    const found = existing.find((c) => c.provider === provider);

    if (found) {
      const updated = await SsoService.updateConfig(organizationId, {
        provider,
        name,
        entityId: body.entityId,
        ssoUrl: body.ssoUrl,
        certificate: body.certificate,
        metadataUrl: body.metadataUrl,
        attributeMapping: body.attributeMapping,
        domains,
      });
      return NextResponse.json({ config: updated });
    }

    const config = await SsoService.createConfig(organizationId, {
      provider,
      name,
      entityId: body.entityId,
      ssoUrl: body.ssoUrl,
      certificate: body.certificate,
      metadataUrl: body.metadataUrl,
      attributeMapping: body.attributeMapping,
      domains,
    });
    return NextResponse.json({ config }, { status: 201 });
  } catch (e) {
    console.error('[security/sso/config] error:', e);
    return NextResponse.json({ error: 'failed_to_create_config' }, { status: 500 });
  }
}
