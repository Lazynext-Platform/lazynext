import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import type { SsoConfig } from '@/lib/services/sso-service';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface MemoryRecord {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  lifecycle: string;
  tags: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const memoryStore: Map<string, MemoryRecord> = new Map();
let idCounter = 0;

interface CallRecord {
  method: string;
  args?: unknown;
}
const calls: CallRecord[] = [];

let memoryFindFirstImpl: (args: unknown) => Promise<MemoryRecord | null> = async () => null;
let memoryFindManyImpl: (args: unknown) => Promise<MemoryRecord[]> = async () => [];
let memoryCreateImpl: (args: unknown) => Promise<MemoryRecord> = async () => ({}) as MemoryRecord;
let memoryDeleteManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });
let memoryUpdateManyImpl: (args: unknown) => Promise<{ count: number }> = async () => ({ count: 0 });

const prismaMock = {
  memory: {
    findFirst: (args: unknown): Promise<MemoryRecord | null> => {
      calls.push({ method: 'memory.findFirst', args });
      return memoryFindFirstImpl(args);
    },
    findMany: (args: unknown): Promise<MemoryRecord[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    create: (args: unknown): Promise<MemoryRecord> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    deleteMany: (args: unknown): Promise<{ count: number }> => {
      calls.push({ method: 'memory.deleteMany', args });
      return memoryDeleteManyImpl(args);
    },
    updateMany: (args: unknown): Promise<{ count: number }> => {
      calls.push({ method: 'memory.updateMany', args });
      return memoryUpdateManyImpl(args);
    },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function resetMock(): void {
  calls.length = 0;
  memoryStore.clear();
  idCounter = 0;

  memoryFindFirstImpl = async (args: unknown) => {
    const a = args as { where: { type: string; organizationId?: string; sourceId?: string } };
    const results: MemoryRecord[] = [];
    for (const rec of memoryStore.values()) {
      if (rec.type !== a.where.type) continue;
      if (a.where.organizationId !== undefined && rec.organizationId !== a.where.organizationId) continue;
      if (a.where.sourceId !== undefined && rec.sourceId !== a.where.sourceId) continue;
      results.push(rec);
    }
    results.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());
    return results[0] || null;
  };

  memoryFindManyImpl = async (args: unknown) => {
    const a = args as { where: { type: string; organizationId?: string } };
    const results: MemoryRecord[] = [];
    for (const rec of memoryStore.values()) {
      if (rec.type !== a.where.type) continue;
      if (a.where.organizationId !== undefined && rec.organizationId !== a.where.organizationId) continue;
      results.push(rec);
    }
    results.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());
    return results;
  };

  memoryCreateImpl = async (args: unknown) => {
    const a = args as { data: Partial<MemoryRecord> };
    const id = `mem-${++idCounter}`;
    const now = new Date();
    const rec: MemoryRecord = {
      id,
      workspaceId: a.data.workspaceId || 'ws',
      organizationId: a.data.organizationId || 'org',
      type: a.data.type || '',
      content: a.data.content || '{}',
      source: a.data.source || 'system',
      sourceId: a.data.sourceId || null,
      confidence: a.data.confidence || 0.5,
      owner: a.data.owner || null,
      lifecycle: a.data.lifecycle || 'medium',
      tags: a.data.tags || '[]',
      createdBy: a.data.createdBy || 'system',
      createdAt: now,
      updatedAt: now,
    };
    memoryStore.set(id, rec);
    return rec;
  };

  memoryDeleteManyImpl = async (args: unknown) => {
    const a = args as { where: { type: string; organizationId?: string; sourceId?: string } };
    let count = 0;
    for (const [id, rec] of memoryStore.entries()) {
      if (rec.type !== a.where.type) continue;
      if (a.where.organizationId !== undefined && rec.organizationId !== a.where.organizationId) continue;
      if (a.where.sourceId !== undefined && rec.sourceId !== a.where.sourceId) continue;
      memoryStore.delete(id);
      count++;
    }
    return { count };
  };

  memoryUpdateManyImpl = async (args: unknown) => {
    const a = args as { where: { type: string; sourceId?: string }, data: { content?: string } };
    let count = 0;
    for (const rec of memoryStore.values()) {
      if (rec.type !== a.where.type) continue;
      if (a.where.sourceId !== undefined && rec.sourceId !== a.where.sourceId) continue;
      if (a.data.content !== undefined) rec.content = a.data.content;
      rec.updatedAt = new Date();
      count++;
    }
    return { count };
  };
}

const { SsoService } = await import('@/lib/services/sso-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SsoService', () => {
  beforeEach(() => { resetMock(); });

  describe('createConfig', () => {
    it('creates an SSO config and stores it in Memory', async () => {
      const config = await SsoService.createConfig('org-1', {
        provider: 'saml',
        name: 'Corporate SAML',
        domains: ['example.com'],
      });

      assert.ok(config.id);
      assert.equal(config.provider, 'saml');
      assert.equal(config.name, 'Corporate SAML');
      assert.deepEqual(config.domains, ['example.com']);
      assert.equal(calls[0].method, 'memory.deleteMany');
      assert.equal(calls[1].method, 'memory.create');
    });

    it('stores config with correct type and sourceId', async () => {
      await SsoService.createConfig('org-1', {
        provider: 'google',
        name: 'Google SSO',
        domains: ['test.io'],
      });

      const stored = Array.from(memoryStore.values())[0];
      assert.equal(stored.type, 'sso_config');
      assert.equal(stored.sourceId, 'org-1:google');
    });
  });

  describe('getConfig', () => {
    it('returns the first config for an organization', async () => {
      await SsoService.createConfig('org-1', {
        provider: 'saml',
        name: 'SAML Config',
        domains: ['example.com'],
      });

      const config = await SsoService.getConfig('org-1');
      assert.ok(config);
      assert.equal(config.provider, 'saml');
    });

    it('returns null when no config exists', async () => {
      const config = await SsoService.getConfig('org-1');
      assert.equal(config, null);
    });
  });

  describe('updateConfig', () => {
    it('updates an existing config', async () => {
      await SsoService.createConfig('org-1', {
        provider: 'saml',
        name: 'Old Name',
        domains: ['old.com'],
      });

      const updated = await SsoService.updateConfig('org-1', {
        provider: 'saml',
        name: 'New Name',
        domains: ['new.com'],
      });

      assert.ok(updated);
      assert.equal(updated.name, 'New Name');
      assert.deepEqual(updated.domains, ['new.com']);
    });

    it('returns null when config does not exist', async () => {
      const result = await SsoService.updateConfig('org-1', {
        provider: 'saml',
        name: 'Test',
      });
      assert.equal(result, null);
    });
  });

  describe('deleteConfig', () => {
    it('deletes a specific provider config', async () => {
      await SsoService.createConfig('org-1', {
        provider: 'saml',
        name: 'SAML',
        domains: ['a.com'],
      });
      assert.equal(memoryStore.size, 1);

      const result = await SsoService.deleteConfig('org-1', 'saml');
      assert.equal(result.deleted, true);
      assert.equal(memoryStore.size, 0);
    });

    it('deletes all configs when no provider specified', async () => {
      await SsoService.createConfig('org-1', { provider: 'saml', name: 'S1', domains: ['a.com'] });
      await SsoService.createConfig('org-1', { provider: 'google', name: 'G1', domains: ['b.com'] });
      assert.equal(memoryStore.size, 2);

      const result = await SsoService.deleteConfig('org-1');
      assert.equal(result.deleted, true);
      assert.equal(memoryStore.size, 0);
    });
  });

  describe('listConfigs', () => {
    it('lists all configs for an organization', async () => {
      await SsoService.createConfig('org-1', { provider: 'saml', name: 'S1', domains: ['a.com'] });
      await SsoService.createConfig('org-1', { provider: 'google', name: 'G1', domains: ['b.com'] });

      const configs = await SsoService.listConfigs('org-1');
      assert.equal(configs.length, 2);
    });

    it('returns empty array when no configs exist', async () => {
      const configs = await SsoService.listConfigs('org-1');
      assert.deepEqual(configs, []);
    });
  });

  describe('getDomains', () => {
    it('flattens domains from all configs', async () => {
      await SsoService.createConfig('org-1', { provider: 'saml', name: 'S1', domains: ['a.com', 'b.com'] });
      await SsoService.createConfig('org-1', { provider: 'google', name: 'G1', domains: ['b.com', 'c.com'] });

      const domains = await SsoService.getDomains('org-1');
      assert.deepEqual(domains.sort(), ['a.com', 'b.com', 'c.com']);
    });

    it('returns empty array when no configs', async () => {
      const domains = await SsoService.getDomains('org-1');
      assert.deepEqual(domains, []);
    });
  });

  describe('matchDomain', () => {
    it('finds config matching the email domain', () => {
      const configs: SsoConfig[] = [
        { id: '1', organizationId: 'org-1', provider: 'saml', name: 'S1', attributeMapping: {}, domains: ['example.com'], createdAt: '', updatedAt: '' },
        { id: '2', organizationId: 'org-1', provider: 'google', name: 'G1', attributeMapping: {}, domains: ['test.io'], createdAt: '', updatedAt: '' },
      ];

      const match = SsoService.matchDomain('user@example.com', configs);
      assert.ok(match);
      assert.equal(match.provider, 'saml');
    });

    it('returns null when no domain matches', () => {
      const configs: SsoConfig[] = [
        { id: '1', organizationId: 'org-1', provider: 'saml', name: 'S1', attributeMapping: {}, domains: ['example.com'], createdAt: '', updatedAt: '' },
      ];

      const match = SsoService.matchDomain('user@other.com', configs);
      assert.equal(match, null);
    });

    it('returns null for invalid email', () => {
      const match = SsoService.matchDomain('not-an-email', []);
      assert.equal(match, null);
    });
  });

  describe('generateSamlRequest', () => {
    it('generates a base64-encoded SAML AuthnRequest', () => {
      const config: SsoConfig = {
        id: '1', organizationId: 'org-1', provider: 'saml', name: 'S1',
        attributeMapping: {}, domains: ['example.com'], createdAt: '', updatedAt: '',
        ssoUrl: 'https://idp.example.com/sso',
      };

      const encoded = SsoService.generateSamlRequest(config);
      const xml = Buffer.from(encoded, 'base64').toString('utf8');
      assert.ok(xml.includes('AuthnRequest'));
      assert.ok(xml.includes('samlp'));
    });

    it('appends relayState when provided', () => {
      const config: SsoConfig = {
        id: '1', organizationId: 'org-1', provider: 'saml', name: 'S1',
        attributeMapping: {}, domains: ['example.com'], createdAt: '', updatedAt: '',
      };

      const encoded = SsoService.generateSamlRequest(config, 'return-here');
      assert.ok(encoded.includes(':'));
    });
  });

  describe('parseSamlResponse', () => {
    it('extracts email and attributes from SAML response', () => {
      const xml = `<?xml version="1.0"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
  <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
    <saml:Subject>
      <saml:NameID>user@example.com</saml:NameID>
    </saml:Subject>
    <saml:AttributeStatement>
      <saml:Attribute Name="firstName">
        <saml:AttributeValue>John</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;
      const encoded = Buffer.from(xml, 'utf8').toString('base64');
      const config: SsoConfig = {
        id: '1', organizationId: 'org-1', provider: 'saml', name: 'S1',
        attributeMapping: {}, domains: ['example.com'], createdAt: '', updatedAt: '',
      };

      const result = SsoService.parseSamlResponse(config, encoded);
      assert.equal(result.email, 'user@example.com');
      assert.equal(result.attributes.firstName, 'John');
    });
  });

  describe('getStats', () => {
    it('returns stats with configured providers and domains', async () => {
      await SsoService.createConfig('org-1', { provider: 'saml', name: 'S1', domains: ['a.com'] });
      await SsoService.createConfig('org-1', { provider: 'google', name: 'G1', domains: ['b.com'] });

      const stats = await SsoService.getStats('org-1');
      assert.equal(stats.configuredProviders, 2);
      assert.deepEqual(stats.domains.sort(), ['a.com', 'b.com']);
      assert.equal(stats.lastLogin, null);
    });
  });
});
