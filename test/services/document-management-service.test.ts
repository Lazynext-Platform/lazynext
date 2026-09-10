import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'doc_template',
    content: JSON.stringify({ name: 'Test', category: 'contract', description: '', content: '', fields: [], version: 1 }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['doc_template', 'contract']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { DocumentManagementService } = await import('@/lib/services/document-management-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('DocumentManagementService', () => {
  beforeEach(() => { resetMock(); });

  // ── Templates ──

  describe('createTemplate', () => {
    it('creates a template with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'doc_template', content: args.data.content as string });
      const tpl = await DocumentManagementService.createTemplate('org-1', 'ws-1', { name: 'NDA' }, 'user-1');
      assert.equal(tpl.name, 'NDA');
      assert.equal(tpl.category, 'other');
      assert.equal(tpl.version, 1);
      assert.equal(tpl.organizationId, 'org-1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'doc_template', content: args.data.content as string });
      const tpl = await DocumentManagementService.createTemplate('org-1', 'ws-1', {
        name: 'Contract', category: 'contract', description: 'desc', content: 'body', fields: [{ name: 'x', type: 'text' }], version: 3,
      }, 'user-1');
      assert.equal(tpl.category, 'contract');
      assert.equal(tpl.version, 3);
    });
  });

  describe('getTemplate', () => {
    it('returns a template when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'doc_template' });
      const tpl = await DocumentManagementService.getTemplate('mem-1');
      assert.ok(tpl);
      assert.equal(tpl!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const tpl = await DocumentManagementService.getTemplate('nope');
      assert.equal(tpl, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'doc_version' });
      const tpl = await DocumentManagementService.getTemplate('mem-1');
      assert.equal(tpl, null);
    });
  });

  describe('listTemplates', () => {
    it('lists templates', async () => {
      memFindManyImpl = async () => [makeRow({ id: 't1' }), makeRow({ id: 't2' })];
      const list = await DocumentManagementService.listTemplates('org-1');
      assert.equal(list.length, 2);
    });

    it('filters by category', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 't1', content: JSON.stringify({ name: 'A', category: 'contract', description: '', content: '', fields: [], version: 1 }) }),
        makeRow({ id: 't2', content: JSON.stringify({ name: 'B', category: 'policy', description: '', content: '', fields: [], version: 1 }) }),
      ];
      const list = await DocumentManagementService.listTemplates('org-1', { category: 'contract' });
      assert.equal(list.length, 1);
      assert.equal(list[0].category, 'contract');
    });
  });

  describe('updateTemplate', () => {
    it('updates template fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'doc_template' });
      memUpdateImpl = async () => makeRow({ type: 'doc_template', content: JSON.stringify({ name: 'Updated', category: 'policy', description: 'd', content: 'c', fields: [], version: 2 }) });
      const tpl = await DocumentManagementService.updateTemplate('mem-1', { name: 'Updated', category: 'policy' });
      assert.ok(tpl);
      assert.equal(tpl!.name, 'Updated');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const tpl = await DocumentManagementService.updateTemplate('nope', { name: 'X' });
      assert.equal(tpl, null);
    });
  });

  describe('deleteTemplate', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await DocumentManagementService.deleteTemplate('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await DocumentManagementService.deleteTemplate('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Documents ──

  describe('createDocument', () => {
    it('creates a document with defaults', async () => {
      let createCount = 0;
      memCreateImpl = async (args) => {
        createCount++;
        if (createCount === 1) return makeRow({ type: 'doc_version', id: 'doc-1', content: args.data.content as string });
        return makeRow({ type: 'doc_version_snapshot', id: 'ver-1', sourceId: 'doc-1', content: args.data.content as string });
      };
      memUpdateImpl = async (args) => makeRow({ type: 'doc_version', id: 'doc-1', content: args.data.content as string });
      const doc = await DocumentManagementService.createDocument('org-1', 'ws-1', { title: 'My Doc', content: 'body' }, 'user-1');
      assert.equal(doc.title, 'My Doc');
      assert.equal(doc.category, 'other');
      assert.equal(doc.classification, 'internal');
      assert.equal(doc.version, 1);
    });

    it('creates a version snapshot and links it', async () => {
      let createCount = 0;
      memCreateImpl = async (args) => {
        createCount++;
        if (createCount === 1) return makeRow({ type: 'doc_version', id: 'doc-1', content: args.data.content as string });
        return makeRow({ type: 'doc_version_snapshot', id: 'ver-1', sourceId: 'doc-1', content: args.data.content as string });
      };
      memUpdateImpl = async () => makeRow({ type: 'doc_version', id: 'doc-1', content: JSON.stringify({ templateId: null, title: 'My Doc', category: 'other', description: '', content: 'body', classification: 'internal', tags: [], version: 1, currentVersionId: 'ver-1', retentionPolicyId: null, expiresAt: null }) });
      const doc = await DocumentManagementService.createDocument('org-1', 'ws-1', { title: 'My Doc', content: 'body' }, 'user-1');
      assert.equal(doc.title, 'My Doc');
    });
  });

  describe('getDocument', () => {
    it('returns a document when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'doc_version', content: JSON.stringify({ templateId: null, title: 'D', category: 'other', description: '', content: '', classification: 'internal', tags: [], version: 1, currentVersionId: null, retentionPolicyId: null, expiresAt: null }) });
      const doc = await DocumentManagementService.getDocument('mem-1');
      assert.ok(doc);
      assert.equal(doc!.title, 'D');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'doc_template' });
      const doc = await DocumentManagementService.getDocument('mem-1');
      assert.equal(doc, null);
    });
  });

  describe('listDocuments', () => {
    it('lists documents', async () => {
      memFindManyImpl = async () => [makeRow({ type: 'doc_version', id: 'd1' })];
      const list = await DocumentManagementService.listDocuments('org-1');
      assert.equal(list.length, 1);
    });

    it('filters by classification', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'd1', content: JSON.stringify({ templateId: null, title: 'A', category: 'other', description: '', content: '', classification: 'confidential', tags: [], version: 1, currentVersionId: null, retentionPolicyId: null, expiresAt: null }) }),
        makeRow({ id: 'd2', content: JSON.stringify({ templateId: null, title: 'B', category: 'other', description: '', content: '', classification: 'public', tags: [], version: 1, currentVersionId: null, retentionPolicyId: null, expiresAt: null }) }),
      ];
      const list = await DocumentManagementService.listDocuments('org-1', { classification: 'public' });
      assert.equal(list.length, 1);
      assert.equal(list[0].classification, 'public');
    });
  });

  describe('updateDocument', () => {
    it('increments version and creates snapshot', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'doc_version', content: JSON.stringify({ templateId: null, title: 'D', category: 'other', description: '', content: 'old', classification: 'internal', tags: [], version: 1, currentVersionId: null, retentionPolicyId: null, expiresAt: null }) });
      let createCount = 0;
      memCreateImpl = async () => { createCount++; return makeRow({ type: 'doc_version_snapshot', id: `v-${createCount}` }); };
      memUpdateImpl = async () => makeRow({ type: 'doc_version', content: JSON.stringify({ templateId: null, title: 'Updated', category: 'other', description: '', content: 'new', classification: 'internal', tags: [], version: 2, currentVersionId: 'v-1', retentionPolicyId: null, expiresAt: null }) });
      const doc = await DocumentManagementService.updateDocument('mem-1', { title: 'Updated', content: 'new' });
      assert.ok(doc);
      assert.equal(doc!.version, 2);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const doc = await DocumentManagementService.updateDocument('nope', { title: 'X' });
      assert.equal(doc, null);
    });
  });

  describe('deleteDocument', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await DocumentManagementService.deleteDocument('mem-1');
      assert.equal(ok, true);
    });
  });

  describe('getDocumentVersions', () => {
    it('lists version snapshots', async () => {
      memFindManyImpl = async () => [makeRow({ type: 'doc_version_snapshot', id: 'v1', sourceId: 'doc-1' })];
      const versions = await DocumentManagementService.getDocumentVersions('doc-1');
      assert.equal(versions.length, 1);
    });
  });

  describe('restoreVersion', () => {
    it('restores a version', async () => {
      memFindUniqueImpl = async (args) => {
        if ((args.where as { id: string }).id === 'ver-1') {
          return makeRow({ type: 'doc_version_snapshot', id: 'ver-1', content: JSON.stringify({ documentId: 'doc-1', version: 1, title: 'Old', content: 'old', description: '', changedBy: 'u', changeNote: '' }) });
        }
        return makeRow({ type: 'doc_version', id: 'doc-1', content: JSON.stringify({ templateId: null, title: 'New', category: 'other', description: '', content: 'new', classification: 'internal', tags: [], version: 2, currentVersionId: null, retentionPolicyId: null, expiresAt: null }) });
      };
      memUpdateImpl = async () => makeRow({ type: 'doc_version', id: 'doc-1', content: JSON.stringify({ templateId: null, title: 'Old', category: 'other', description: '', content: 'old', classification: 'internal', tags: [], version: 3, currentVersionId: 'ver-1', retentionPolicyId: null, expiresAt: null }) });
      const doc = await DocumentManagementService.restoreVersion('doc-1', 'ver-1');
      assert.ok(doc);
      assert.equal(doc!.title, 'Old');
    });

    it('returns null when version not found', async () => {
      memFindUniqueImpl = async () => null;
      const doc = await DocumentManagementService.restoreVersion('doc-1', 'nope');
      assert.equal(doc, null);
    });
  });

  // ── Classification Rules ──

  describe('createClassRule', () => {
    it('creates a classification rule', async () => {
      memCreateImpl = async () => makeRow({ type: 'doc_classification', content: JSON.stringify({ name: 'Rule', classification: 'confidential', criteria: 'contains PII', autoClassify: true }) });
      const rule = await DocumentManagementService.createClassRule('org-1', 'ws-1', { name: 'Rule', classification: 'confidential', criteria: 'contains PII', autoClassify: true }, 'user-1');
      assert.equal(rule.name, 'Rule');
      assert.equal(rule.classification, 'confidential');
      assert.equal(rule.autoClassify, true);
    });
  });

  describe('getClassRules', () => {
    it('lists classification rules', async () => {
      memFindManyImpl = async () => [makeRow({ type: 'doc_classification', id: 'c1' })];
      const rules = await DocumentManagementService.getClassRules('org-1');
      assert.equal(rules.length, 1);
    });
  });

  describe('updateClassRule', () => {
    it('updates a classification rule', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'doc_classification', content: JSON.stringify({ name: 'Old', classification: 'internal', criteria: 'c', autoClassify: false }) });
      memUpdateImpl = async () => makeRow({ type: 'doc_classification', content: JSON.stringify({ name: 'New', classification: 'restricted', criteria: 'c', autoClassify: true }) });
      const rule = await DocumentManagementService.updateClassRule('mem-1', { name: 'New', classification: 'restricted', autoClassify: true });
      assert.ok(rule);
      assert.equal(rule!.name, 'New');
    });
  });

  describe('deleteClassRule', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await DocumentManagementService.deleteClassRule('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Retention Policies ──

  describe('createRetentionPolicy', () => {
    it('creates a retention policy', async () => {
      memCreateImpl = async () => makeRow({ type: 'retention_policy', content: JSON.stringify({ name: 'P', category: 'all', retentionDays: 365, action: 'archive', description: '' }) });
      const policy = await DocumentManagementService.createRetentionPolicy('org-1', 'ws-1', { name: 'P', retentionDays: 365, action: 'archive' }, 'user-1');
      assert.equal(policy.name, 'P');
      assert.equal(policy.retentionDays, 365);
    });
  });

  describe('getRetentionPolicies', () => {
    it('lists retention policies', async () => {
      memFindManyImpl = async () => [makeRow({ type: 'retention_policy', id: 'r1' })];
      const policies = await DocumentManagementService.getRetentionPolicies('org-1');
      assert.equal(policies.length, 1);
    });
  });

  // ── E-Sign ──

  describe('createESignRequest', () => {
    it('creates an e-sign request with signers', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'esign_request', content: args.data.content as string });
      const req = await DocumentManagementService.createESignRequest('org-1', 'ws-1', {
        documentId: 'doc-1', title: 'Sign Me', signers: [{ name: 'Alice', email: 'alice@test.com' }, { name: 'Bob', email: 'bob@test.com' }],
      }, 'user-1');
      assert.equal(req.title, 'Sign Me');
      assert.equal(req.signers.length, 2);
      assert.equal(req.signers[0].order, 1);
      assert.equal(req.signers[1].order, 2);
      assert.equal(req.status, 'pending');
    });
  });

  describe('getESignRequest', () => {
    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'doc_template' });
      const req = await DocumentManagementService.getESignRequest('mem-1');
      assert.equal(req, null);
    });
  });

  describe('cancelESignRequest', () => {
    it('cancels a request with reason', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'esign_request', content: JSON.stringify({ documentId: 'd', title: 'T', signers: [], message: '', status: 'pending', expiresAt: null, cancelReason: '', completedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'esign_request', content: args.data.content as string });
      const req = await DocumentManagementService.cancelESignRequest('mem-1', 'Changed mind');
      assert.ok(req);
      assert.equal(req!.status, 'cancelled');
      assert.equal(req!.cancelReason, 'Changed mind');
    });
  });

  describe('signDocument', () => {
    it('records a signature', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'esign_request', content: JSON.stringify({ documentId: 'd', title: 'T', signers: [{ name: 'Alice', email: 'alice@test.com', role: 'signer', order: 1 }], message: '', status: 'pending', expiresAt: null, cancelReason: '', completedAt: null }) });
      memCreateImpl = async (args) => makeRow({ type: 'esign_signature', content: args.data.content as string });
      const result = await DocumentManagementService.signDocument('mem-1', { signerEmail: 'alice@test.com', signature: 'sig' });
      assert.equal(result.signature.signerEmail, 'alice@test.com');
    });

    it('throws when request not found', async () => {
      memFindUniqueImpl = async () => null;
      await assert.rejects(() => DocumentManagementService.signDocument('nope', { signerEmail: 'a@b.com', signature: 's' }));
    });
  });

  describe('getSignatures', () => {
    it('lists signatures for a request', async () => {
      memFindManyImpl = async () => [makeRow({ type: 'esign_signature', id: 's1', sourceId: 'req-1' })];
      const sigs = await DocumentManagementService.getSignatures('req-1');
      assert.equal(sigs.length, 1);
    });
  });

  // ── Audit Trail ──

  describe('getAuditTrail', () => {
    it('lists audit events for a document', async () => {
      memFindManyImpl = async () => [makeRow({ type: 'doc_audit_event', id: 'a1', sourceId: 'doc-1' })];
      const events = await DocumentManagementService.getAuditTrail('doc-1');
      assert.equal(events.length, 1);
    });
  });

  // ── Stats ──

  describe('getStats', () => {
    it('aggregates stats correctly', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'doc_template') return [makeRow({ type: 'doc_template' })];
        if (where.type === 'doc_version') return [makeRow({ type: 'doc_version', content: JSON.stringify({ templateId: null, title: 'D', category: 'contract', description: '', content: '', classification: 'confidential', tags: [], version: 1, currentVersionId: null, retentionPolicyId: null, expiresAt: null }) })];
        if (where.type === 'esign_request') return [makeRow({ type: 'esign_request', content: JSON.stringify({ documentId: 'd', title: 'T', signers: [], message: '', status: 'pending', expiresAt: null, cancelReason: '', completedAt: null }) })];
        if (where.type === 'doc_classification') return [makeRow({ type: 'doc_classification' })];
        if (where.type === 'retention_policy') return [makeRow({ type: 'retention_policy' })];
        return [];
      };
      const stats = await DocumentManagementService.getStats('org-1');
      assert.equal(stats.templateCount, 1);
      assert.equal(stats.documentCount, 1);
      assert.equal(stats.esignRequestCount, 1);
      assert.equal(stats.pendingEsignCount, 1);
      assert.equal(stats.classRuleCount, 1);
      assert.equal(stats.retentionPolicyCount, 1);
      assert.equal(stats.byCategory['contract'], 1);
      assert.equal(stats.byClassification['confidential'], 1);
    });
  });
});
