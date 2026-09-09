/**
 * SSO (Single Sign-On) Service.
 *
 * Stores SSO configurations in the Memory table with type 'sso_config'.
 * Memory types used:
 *   - 'sso_config' — provider configuration (key = `${organizationId}:${provider}`)
 *   - 'sso_login'  — last login timestamp marker (key = `${organizationId}:${provider}`)
 *
 * The Memory model requires workspaceId + organizationId. For org-scoped
 * SSO data we use the organizationId for both fields (workspaceId is set
 * to the organizationId as a sentinel when no specific workspace is given).
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { randomBytes, createHash } from 'crypto';

// ── Constants ──

const SSO_CONFIG_TYPE = 'sso_config';
const SSO_LOGIN_TYPE = 'sso_login';
const SENTINEL_WORKSPACE = 'org-scoped';

// ── Types ──

export type SsoProvider = 'saml' | 'oidc' | 'google' | 'microsoft' | 'okta' | 'auth0';

export interface SsoConfigInput {
  provider: SsoProvider;
  name: string;
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;
  metadataUrl?: string;
  attributeMapping?: Record<string, string>;
  domains: string[];
}

export interface SsoConfig extends Omit<SsoConfigInput, 'attributeMapping'> {
  id: string;
  organizationId: string;
  attributeMapping: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface SsoStats {
  configuredProviders: number;
  domains: string[];
  lastLogin: string | null;
}

export interface SsoMetadata {
  entityId: string;
  ssoUrl: string;
  certificate: string | null;
}

// ── SSO Service ──

export const SsoService = {
  /**
   * Create a new SSO configuration.
   */
  async createConfig(organizationId: string, input: SsoConfigInput): Promise<SsoConfig> {
    const key = `${organizationId}:${input.provider}`;
    const config = {
      provider: input.provider,
      name: input.name,
      entityId: input.entityId || undefined,
      ssoUrl: input.ssoUrl || undefined,
      certificate: input.certificate || undefined,
      metadataUrl: input.metadataUrl || undefined,
      attributeMapping: input.attributeMapping || {},
      domains: input.domains || [],
    };

    // Remove any existing config for this org+provider
    await safePrisma(
      () =>
        prisma.memory.deleteMany({
          where: { type: SSO_CONFIG_TYPE, sourceId: key },
        }),
      { count: 0 },
    );

    const mem = await prisma.memory.create({
      data: {
        workspaceId: SENTINEL_WORKSPACE,
        organizationId,
        type: SSO_CONFIG_TYPE,
        content: JSON.stringify(config),
        source: 'system',
        sourceId: key,
        confidence: 1.0,
        owner: organizationId,
        lifecycle: 'permanent',
        tags: JSON.stringify(['sso', input.provider]),
        createdBy: organizationId,
      },
    });

    return {
      id: mem.id,
      organizationId,
      ...config,
      createdAt: mem.createdAt.toISOString(),
      updatedAt: mem.updatedAt.toISOString(),
    };
  },

  /**
   * Get the SSO configuration for an organization (first config).
   */
  async getConfig(organizationId: string): Promise<SsoConfig | null> {
    const mem = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: { type: SSO_CONFIG_TYPE, organizationId },
          orderBy: { createdAt: 'asc' },
        }),
      null,
    );
    if (!mem) return null;
    return parseConfig(mem, organizationId);
  },

  /**
   * Update an existing SSO configuration.
   */
  async updateConfig(organizationId: string, input: Partial<SsoConfigInput> & { provider: SsoProvider }): Promise<SsoConfig | null> {
    const key = `${organizationId}:${input.provider}`;
    const mem = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: { type: SSO_CONFIG_TYPE, sourceId: key },
        }),
      null,
    );
    if (!mem) return null;

    const existing = JSON.parse(mem.content) as Record<string, unknown>;
    const updated = {
      ...existing,
      provider: input.provider,
      name: input.name ?? existing.name,
      entityId: input.entityId ?? existing.entityId,
      ssoUrl: input.ssoUrl ?? existing.ssoUrl,
      certificate: input.certificate ?? existing.certificate,
      metadataUrl: input.metadataUrl ?? existing.metadataUrl,
      attributeMapping: input.attributeMapping ?? existing.attributeMapping,
      domains: input.domains ?? existing.domains,
    };

    await prisma.memory.updateMany({
      where: { type: SSO_CONFIG_TYPE, sourceId: key },
      data: { content: JSON.stringify(updated) },
    });

    return {
      id: mem.id,
      organizationId,
      provider: updated.provider as SsoProvider,
      name: updated.name as string,
      entityId: (updated.entityId as string) || undefined,
      ssoUrl: (updated.ssoUrl as string) || undefined,
      certificate: (updated.certificate as string) || undefined,
      metadataUrl: (updated.metadataUrl as string) || undefined,
      attributeMapping: updated.attributeMapping as Record<string, string>,
      domains: updated.domains as string[],
      createdAt: mem.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Delete SSO configuration(s) for an organization.
   * If provider is specified, deletes only that provider's config.
   */
  async deleteConfig(organizationId: string, provider?: SsoProvider): Promise<{ deleted: boolean }> {
    const where = provider
      ? { type: SSO_CONFIG_TYPE, sourceId: `${organizationId}:${provider}` }
      : { type: SSO_CONFIG_TYPE, organizationId };

    await safePrisma(
      () => prisma.memory.deleteMany({ where }),
      { count: 0 },
    );

    return { deleted: true };
  },

  /**
   * List all SSO configurations for an organization.
   */
  async listConfigs(organizationId: string): Promise<SsoConfig[]> {
    const mems = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: SSO_CONFIG_TYPE, organizationId },
          orderBy: { createdAt: 'asc' },
        }),
      [],
    );
    return mems.map((m) => parseConfig(m, organizationId));
  },

  /**
   * Get all domains that use SSO for an organization (flattened from all configs).
   */
  async getDomains(organizationId: string): Promise<string[]> {
    const configs = await this.listConfigs(organizationId);
    const domains = new Set<string>();
    for (const c of configs) {
      for (const d of c.domains) {
        domains.add(d.toLowerCase());
      }
    }
    return Array.from(domains);
  },

  /**
   * Find the SSO config matching an email domain.
   */
  matchDomain(email: string, configs: SsoConfig[]): SsoConfig | null {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    for (const c of configs) {
      if (c.domains.some((d) => d.toLowerCase() === domain)) {
        return c;
      }
    }
    return null;
  },

  /**
   * Generate a SAML AuthnRequest (base64-encoded XML).
   */
  generateSamlRequest(config: SsoConfig, relayState?: string): string {
    const requestId = `_${randomBytes(16).toString('hex')}`;
    const issueInstant = new Date().toISOString();
    const entityId = config.entityId || `https://lazynext.app/sso/${config.organizationId}`;
    const assertionConsumerUrl = `https://lazynext.app/api/security/sso/callback`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="${requestId}" Version="2.0" IssueInstant="${issueInstant}" AssertionConsumerServiceURL="${assertionConsumerUrl}" Destination="${config.ssoUrl || ''}">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${entityId}</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>`;

    const encoded = Buffer.from(xml, 'utf8').toString('base64');
    if (relayState) {
      return `${encoded}:${Buffer.from(relayState, 'utf8').toString('base64')}`;
    }
    return encoded;
  },

  /**
   * Parse a SAML response (base64-decode, extract attributes).
   */
  parseSamlResponse(config: SsoConfig, response: string): { email: string | null; name: string | null; attributes: Record<string, string> } {
    let xml: string;
    try {
      xml = Buffer.from(response, 'base64').toString('utf8');
    } catch {
      return { email: null, name: null, attributes: {} };
    }

    const attributes: Record<string, string> = {};

    // Extract NameID (email)
    const nameIdMatch = xml.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/i);
    const email = nameIdMatch?.[1] || null;

    // Extract attribute statements
    const attrRegex = /<saml:Attribute\s+Name="([^"]+)"[^>]*>\s*<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/gi;
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(xml)) !== null) {
      attributes[match[1]] = match[2];
    }

    // Derive name from attributes
    const name =
      attributes['name'] ||
      attributes['Name'] ||
      [attributes['firstName'], attributes['lastName']].filter(Boolean).join(' ') ||
      null;

    // Record last login
    void this.recordLogin(config.organizationId, config.provider);

    return { email, name, attributes };
  },

  /**
   * Generate SP metadata XML string.
   */
  async getMetadata(organizationId: string): Promise<string> {
    const config = await this.getConfig(organizationId);
    const entityId = config?.entityId || `https://lazynext.app/sso/${organizationId}`;
    const cert = config?.certificate || '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://lazynext.app/api/security/sso/callback" index="0"/>
    <X509Certificate>${cert}</X509Certificate>
  </SPSSODescriptor>
</EntityDescriptor>`;
  },

  /**
   * Get SSO statistics for an organization.
   */
  async getStats(organizationId: string): Promise<SsoStats> {
    const configs = await this.listConfigs(organizationId);
    const domains = await this.getDomains(organizationId);

    // Check for last login marker
    const loginMem = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: { type: SSO_LOGIN_TYPE, organizationId },
          orderBy: { updatedAt: 'desc' },
        }),
      null,
    );

    let lastLogin: string | null = null;
    if (loginMem) {
      try {
        const data = JSON.parse(loginMem.content) as { lastLogin?: string };
        lastLogin = data.lastLogin || loginMem.updatedAt.toISOString();
      } catch {
        lastLogin = loginMem.updatedAt.toISOString();
      }
    }

    return {
      configuredProviders: configs.length,
      domains,
      lastLogin,
    };
  },

  // ── Internal helpers ──

  async recordLogin(organizationId: string, provider: SsoProvider): Promise<void> {
    const key = `${organizationId}:${provider}`;
    const content = JSON.stringify({ lastLogin: new Date().toISOString(), provider });

    await safePrisma(
      () =>
        prisma.memory.deleteMany({
          where: { type: SSO_LOGIN_TYPE, sourceId: key },
        }),
      { count: 0 },
    );

    await safePrisma(
      () =>
        prisma.memory.create({
          data: {
            workspaceId: SENTINEL_WORKSPACE,
            organizationId,
            type: SSO_LOGIN_TYPE,
            content,
            source: 'system',
            sourceId: organizationId,
            confidence: 1.0,
            owner: organizationId,
            lifecycle: 'long',
            tags: JSON.stringify(['sso', 'login']),
            createdBy: organizationId,
          },
        }),
      null,
    );
  },
};

// ── Internal helpers ──

function parseConfig(
  mem: { id: string; content: string; createdAt: Date; updatedAt: Date },
  organizationId: string,
): SsoConfig {
  const data = JSON.parse(mem.content) as Record<string, unknown>;
  return {
    id: mem.id,
    organizationId,
    provider: data.provider as SsoProvider,
    name: data.name as string,
    entityId: (data.entityId as string) || undefined,
    ssoUrl: (data.ssoUrl as string) || undefined,
    certificate: (data.certificate as string) || undefined,
    metadataUrl: (data.metadataUrl as string) || undefined,
    attributeMapping: (data.attributeMapping as Record<string, string>) || {},
    domains: (data.domains as string[]) || [],
    createdAt: mem.createdAt.toISOString(),
    updatedAt: mem.updatedAt.toISOString(),
  };
}
