import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type EmployeeFindManyArgs = {
  where: Record<string, unknown>;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
  distinct?: string[];
};

type EmployeeFindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
};

type EmployeeFindFirstArgs = {
  where: Record<string, unknown>;
};

type EmployeeCreateArgs = {
  data: Record<string, unknown>;
};

type EmployeeUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type EmployeeDeleteArgs = {
  where: { id: string };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let employeeFindManyImpl: (args: EmployeeFindManyArgs) => Promise<unknown[]> =
  async () => [];
let employeeFindUniqueImpl: (args: EmployeeFindUniqueArgs) => Promise<unknown> =
  async () => null;
let employeeFindFirstImpl: (args: EmployeeFindFirstArgs) => Promise<unknown> =
  async () => null;
let employeeCreateImpl: (args: EmployeeCreateArgs) => Promise<unknown> =
  async () => ({});
let employeeUpdateImpl: (args: EmployeeUpdateArgs) => Promise<unknown> =
  async () => ({});
let employeeDeleteImpl: (args: EmployeeDeleteArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  employee: {
    findMany: (args: EmployeeFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'employee.findMany', args });
      return employeeFindManyImpl(args);
    },
    findUnique: (args: EmployeeFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'employee.findUnique', args });
      return employeeFindUniqueImpl(args);
    },
    findFirst: (args: EmployeeFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'employee.findFirst', args });
      return employeeFindFirstImpl(args);
    },
    create: (args: EmployeeCreateArgs): Promise<unknown> => {
      calls.push({ method: 'employee.create', args });
      return employeeCreateImpl(args);
    },
    update: (args: EmployeeUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'employee.update', args });
      return employeeUpdateImpl(args);
    },
    delete: (args: EmployeeDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'employee.delete', args });
      return employeeDeleteImpl(args);
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
  employeeFindManyImpl = async () => [];
  employeeFindUniqueImpl = async () => null;
  employeeFindFirstImpl = async () => null;
  employeeCreateImpl = async () => ({});
  employeeUpdateImpl = async () => ({});
  employeeDeleteImpl = async () => ({});
}

const { EmployeeService } = await import('@/lib/services/employee-service');

// ─────────────────────────────────────────────────────────────────────────────
// EmployeeService
// ─────────────────────────────────────────────────────────────────────────────

describe('EmployeeService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates an employee with defaults', async () => {
      employeeCreateImpl = async (args: EmployeeCreateArgs) => {
        assert.equal(args.data.employmentType, 'full_time');
        assert.equal(args.data.status, 'active');
        assert.equal(args.data.salaryCurrency, 'USD');
        assert.equal(args.data.payFrequency, 'monthly');
        assert.equal(args.data.timezone, 'UTC');
        return { id: 'e1', ...args.data };
      };

      const result = await EmployeeService.create({
        organizationId: 'org-1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
      });

      assert.ok(result);
      assert.equal(result.id, 'e1');
      assert.equal(calls[0].method, 'employee.create');
    });

    it('serializes documents and skills to JSON strings', async () => {
      employeeCreateImpl = async (args: EmployeeCreateArgs) => {
        assert.equal(typeof args.data.documents, 'string');
        assert.equal(typeof args.data.skills, 'string');
        const docs = JSON.parse(args.data.documents as string);
        assert.equal(docs.length, 1);
        return { id: 'e1' };
      };

      await EmployeeService.create({
        organizationId: 'org-1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        documents: [{ name: 'Contract', url: 'http://example.com/doc.pdf', type: 'pdf' }],
        skills: [{ name: 'TypeScript', level: 'expert' }],
      });
    });

    it('truncates long names', async () => {
      employeeCreateImpl = async (args: EmployeeCreateArgs) => {
        assert.ok((args.data.firstName as string).length <= 200);
        return { id: 'e1' };
      };

      await EmployeeService.create({
        organizationId: 'org-1',
        firstName: 'A'.repeat(500),
        lastName: 'Smith',
        email: 'alice@example.com',
      });
    });
  });

  describe('get', () => {
    it('returns an employee by id with manager and reports', async () => {
      employeeFindUniqueImpl = async () =>
        ({ id: 'e1', firstName: 'Alice', manager: { id: 'm1' }, directReports: [] });

      const result = await EmployeeService.get('e1');

      assert.ok(result);
      assert.equal(result.id, 'e1');
      assert.equal(calls[0].method, 'employee.findUnique');
    });

    it('returns null when employee not found', async () => {
      employeeFindUniqueImpl = async () => null;

      const result = await EmployeeService.get('nope');
      assert.equal(result, null);
    });

    it('returns null on error (safePrisma fallback)', async () => {
      employeeFindUniqueImpl = async () => { throw new Error('fail'); };

      const result = await EmployeeService.get('e1');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('returns employees for an organization', async () => {
      employeeFindManyImpl = async () =>
        ([{ id: 'e1', firstName: 'Alice', _count: { directReports: 2 } }]);

      const result = await EmployeeService.list('org-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'e1');
      const args = calls[0].args as EmployeeFindManyArgs;
      assert.equal(args.where.organizationId, 'org-1');
    });

    it('applies department and status filters', async () => {
      employeeFindManyImpl = async () => [];

      await EmployeeService.list('org-1', { department: 'Engineering', status: 'active' });

      const args = calls[0].args as EmployeeFindManyArgs;
      assert.equal(args.where.department, 'Engineering');
      assert.equal(args.where.status, 'active');
    });

    it('applies managerId and workspaceId filters', async () => {
      employeeFindManyImpl = async () => [];

      await EmployeeService.list('org-1', { managerId: 'm1', workspaceId: 'ws-1' });

      const args = calls[0].args as EmployeeFindManyArgs;
      assert.equal(args.where.managerId, 'm1');
      assert.equal(args.where.workspaceId, 'ws-1');
    });

    it('applies search filter with OR conditions', async () => {
      employeeFindManyImpl = async () => [];

      await EmployeeService.list('org-1', { search: 'alice' });

      const args = calls[0].args as EmployeeFindManyArgs;
      assert.ok(Array.isArray(args.where.OR));
      assert.ok((args.where.OR as unknown[]).length > 0);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      employeeFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await EmployeeService.list('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      employeeUpdateImpl = async (args: EmployeeUpdateArgs) => {
        assert.equal(args.data.firstName, 'NewName');
        assert.equal(args.data.email, undefined);
        return { id: 'e1', ...args.data };
      };

      const result = await EmployeeService.update('e1', { firstName: 'NewName' });
      assert.ok(result);
      assert.equal(calls[0].method, 'employee.update');
    });

    it('serializes documents on update', async () => {
      employeeUpdateImpl = async (args: EmployeeUpdateArgs) => {
        assert.equal(typeof args.data.documents, 'string');
        return { id: 'e1' };
      };

      await EmployeeService.update('e1', { documents: [{ name: 'Doc', url: 'http://x.com', type: 'pdf' }] });
    });
  });

  describe('delete', () => {
    it('deletes an employee', async () => {
      employeeDeleteImpl = async () => ({ id: 'e1' });

      await EmployeeService.delete('e1');
      assert.equal(calls[0].method, 'employee.delete');
    });
  });

  describe('getByUserId', () => {
    it('returns an employee by user id', async () => {
      employeeFindFirstImpl = async () => ({ id: 'e1', userId: 'u1' });

      const result = await EmployeeService.getByUserId('u1');
      assert.ok(result);
      assert.equal(result.id, 'e1');
    });

    it('returns null on error', async () => {
      employeeFindFirstImpl = async () => { throw new Error('fail'); };

      const result = await EmployeeService.getByUserId('u1');
      assert.equal(result, null);
    });
  });

  describe('getDirectReports', () => {
    it('returns direct reports for a manager', async () => {
      employeeFindManyImpl = async () =>
        ([{ id: 'e1', firstName: 'Bob' }, { id: 'e2', firstName: 'Carol' }]);

      const result = await EmployeeService.getDirectReports('m1');
      assert.equal(result.length, 2);
      const args = calls[0].args as EmployeeFindManyArgs;
      assert.equal(args.where.managerId, 'm1');
    });

    it('returns empty array on error', async () => {
      employeeFindManyImpl = async () => { throw new Error('fail'); };

      const result = await EmployeeService.getDirectReports('m1');
      assert.deepEqual(result, []);
    });
  });

  describe('getOrgChart', () => {
    it('builds a nested tree from employees', async () => {
      employeeFindManyImpl = async () => ([
        { id: 'e1', firstName: 'CEO', lastName: 'Boss', managerId: null },
        { id: 'e2', firstName: 'VP', lastName: 'Eng', managerId: 'e1' },
        { id: 'e3', firstName: 'Dev', lastName: 'One', managerId: 'e2' },
      ]);

      const tree = await EmployeeService.getOrgChart('org-1') as Array<{
        id: string;
        children: Array<{ id: string; children: unknown[] }>;
      }>;
      assert.ok(Array.isArray(tree));
      assert.equal(tree.length, 1);
      assert.equal(tree[0].id, 'e1');
      assert.equal(tree[0].children.length, 1);
      assert.equal(tree[0].children[0].id, 'e2');
      assert.equal(tree[0].children[0].children.length, 1);
    });

    it('returns empty tree on error', async () => {
      employeeFindManyImpl = async () => { throw new Error('fail'); };

      const tree = await EmployeeService.getOrgChart('org-1');
      assert.deepEqual(tree, []);
    });
  });

  describe('getDepartments', () => {
    it('returns distinct departments sorted', async () => {
      employeeFindManyImpl = async () => ([
        { department: 'Engineering' },
        { department: 'Sales' },
        { department: 'Engineering' },
      ]);

      const depts = await EmployeeService.getDepartments('org-1');
      // The mock doesn't implement distinct, so duplicates may appear.
      // The service uses distinct in production; just check the unique set matches.
      assert.deepEqual([...new Set(depts)].sort(), ['Engineering', 'Sales']);
    });

    it('filters out empty departments', async () => {
      employeeFindManyImpl = async () => ([
        { department: '' },
        { department: 'Engineering' },
      ]);

      const depts = await EmployeeService.getDepartments('org-1');
      assert.deepEqual(depts, ['Engineering']);
    });
  });

  describe('getStats', () => {
    it('aggregates employee stats', async () => {
      employeeFindManyImpl = async () => ([
        { status: 'active', department: 'Eng', employmentType: 'full_time', salary: 100000, salaryCurrency: 'USD' },
        { status: 'active', department: 'Sales', employmentType: 'full_time', salary: 80000, salaryCurrency: 'USD' },
        { status: 'terminated', department: 'Eng', employmentType: 'contractor', salary: null, salaryCurrency: 'USD' },
      ]);

      const stats = await EmployeeService.getStats('org-1');
      assert.equal(stats.total, 3);
      assert.equal(stats.activeCount, 2);
      assert.equal(stats.byStatus.active, 2);
      assert.equal(stats.byStatus.terminated, 1);
      assert.equal(stats.byDepartment.Eng, 2);
      assert.equal(stats.averageSalary, 90000);
    });

    it('returns zero stats on error', async () => {
      employeeFindManyImpl = async () => { throw new Error('fail'); };

      const stats = await EmployeeService.getStats('org-1');
      assert.equal(stats.total, 0);
    });
  });

  describe('setManager', () => {
    it('sets the manager id', async () => {
      employeeUpdateImpl = async (args: EmployeeUpdateArgs) => {
        assert.equal(args.data.managerId, 'm1');
        return { id: 'e1', managerId: 'm1' };
      };

      await EmployeeService.setManager('e1', 'm1');
    });

    it('clears the manager when null', async () => {
      employeeUpdateImpl = async (args: EmployeeUpdateArgs) => {
        assert.equal(args.data.managerId, null);
        return { id: 'e1' };
      };

      await EmployeeService.setManager('e1', null);
    });
  });

  describe('terminate', () => {
    it('sets status to terminated with termination date', async () => {
      employeeUpdateImpl = async (args: EmployeeUpdateArgs) => {
        assert.equal(args.data.status, 'terminated');
        assert.ok(args.data.terminationDate instanceof Date);
        return { id: 'e1' };
      };

      await EmployeeService.terminate('e1');
    });
  });

  describe('reactivate', () => {
    it('sets status to active and clears termination date', async () => {
      employeeUpdateImpl = async (args: EmployeeUpdateArgs) => {
        assert.equal(args.data.status, 'active');
        assert.equal(args.data.terminationDate, null);
        return { id: 'e1' };
      };

      await EmployeeService.reactivate('e1');
    });
  });

  describe('addDocument', () => {
    it('appends a document to the documents array', async () => {
      employeeFindUniqueImpl = async () => ({ documents: '[]' });
      employeeUpdateImpl = async (args: EmployeeUpdateArgs) => {
        const docs = JSON.parse(args.data.documents as string);
        assert.equal(docs.length, 1);
        assert.equal(docs[0].name, 'Contract');
        return { id: 'e1' };
      };

      await EmployeeService.addDocument('e1', { name: 'Contract', url: 'http://x.com/d.pdf', type: 'pdf' });
    });

    it('throws if employee not found', async () => {
      employeeFindUniqueImpl = async () => null;

      await assert.rejects(() => EmployeeService.addDocument('nope', { name: 'X', url: 'http://x.com', type: 'pdf' }));
    });
  });

  describe('removeDocument', () => {
    it('removes a document by url', async () => {
      employeeFindUniqueImpl = async () => ({ documents: '[{"name":"A","url":"http://a.com","type":"pdf"},{"name":"B","url":"http://b.com","type":"pdf"}]' });
      employeeUpdateImpl = async (args: EmployeeUpdateArgs) => {
        const docs = JSON.parse(args.data.documents as string);
        assert.equal(docs.length, 1);
        assert.equal(docs[0].url, 'http://b.com');
        return { id: 'e1' };
      };

      await EmployeeService.removeDocument('e1', 'http://a.com');
    });
  });

  describe('addSkill', () => {
    it('appends a skill to the skills array', async () => {
      employeeFindUniqueImpl = async () => ({ skills: '[]' });
      employeeUpdateImpl = async (args: EmployeeUpdateArgs) => {
        const skills = JSON.parse(args.data.skills as string);
        assert.equal(skills.length, 1);
        assert.equal(skills[0].name, 'TypeScript');
        return { id: 'e1' };
      };

      await EmployeeService.addSkill('e1', { name: 'TypeScript', level: 'expert' });
    });
  });

  describe('getOnboardingChecklist', () => {
    it('returns checklist with completed items', async () => {
      employeeFindUniqueImpl = async () => ({
        id: 'e1', firstName: 'Alice', lastName: 'Smith',
        hireDate: new Date(), status: 'active',
        documents: '[{"name":"X","url":"http://x.com","type":"pdf"}]',
        emergencyContact: '{"name":"Bob","phone":"555-1234"}',
        address: '123 Main St',
      });

      const result = await EmployeeService.getOnboardingChecklist('e1');
      assert.ok(result);
      assert.equal(result.checklist.length, 5);
      const profileItem = result.checklist.find((c: { id: string }) => c.id === 'profile');
      assert.ok(profileItem?.completed);
    });

    it('returns null when employee not found', async () => {
      employeeFindUniqueImpl = async () => null;

      const result = await EmployeeService.getOnboardingChecklist('nope');
      assert.equal(result, null);
    });
  });
});
