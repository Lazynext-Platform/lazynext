import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface EmployeeDocument {
  name: string;
  url: string;
  type: string;
}

export interface EmployeeSkill {
  name: string;
  level?: string;
}

export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

export interface EmployeeFilters {
  department?: string;
  status?: string;
  managerId?: string;
  workspaceId?: string;
  search?: string;
}

// ── Helpers ──

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function serializeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[]';
  }
}

// ── Employee Service ──

export const EmployeeService = {
  /**
   * Create a new employee.
   */
  async create(input: {
    organizationId: string;
    workspaceId?: string;
    userId?: string;
    employeeId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
    position?: string;
    department?: string;
    managerId?: string;
    employmentType?: string;
    status?: string;
    hireDate?: Date;
    salary?: number;
    salaryCurrency?: string;
    payFrequency?: string;
    location?: string;
    timezone?: string;
    address?: string;
    emergencyContact?: EmergencyContact;
    documents?: EmployeeDocument[];
    skills?: EmployeeSkill[];
    notes?: string;
  }) {
    return prisma.employee.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        userId: input.userId || null,
        employeeId: input.employeeId || null,
        firstName: input.firstName.slice(0, 200),
        lastName: input.lastName.slice(0, 200),
        email: input.email.slice(0, 500),
        phone: input.phone?.slice(0, 100) || null,
        avatar: input.avatar || null,
        position: input.position || '',
        department: input.department || '',
        managerId: input.managerId || null,
        employmentType: input.employmentType || 'full_time',
        status: input.status || 'active',
        hireDate: input.hireDate || null,
        salary: input.salary ?? null,
        salaryCurrency: input.salaryCurrency || 'USD',
        payFrequency: input.payFrequency || 'monthly',
        location: input.location || '',
        timezone: input.timezone || 'UTC',
        address: input.address || '',
        emergencyContact: serializeJson(input.emergencyContact || {}),
        documents: serializeJson(input.documents || []),
        skills: serializeJson(input.skills || []),
        notes: input.notes || '',
      },
    });
  },

  /**
   * Get a single employee by ID, with manager and direct reports.
   */
  async get(id: string) {
    return safePrisma(() =>
      prisma.employee.findUnique({
        where: { id },
        include: {
          manager: { select: { id: true, firstName: true, lastName: true, email: true, position: true } },
          directReports: {
            select: { id: true, firstName: true, lastName: true, email: true, position: true, department: true, status: true },
          },
        },
      }),
    null);
  },

  /**
   * List employees with optional filters.
   */
  async list(organizationId: string, filters?: EmployeeFilters) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.department) where.department = filters.department;
    if (filters?.status) where.status = filters.status;
    if (filters?.managerId) where.managerId = filters.managerId;
    if (filters?.workspaceId) where.workspaceId = filters.workspaceId;
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search } },
        { lastName: { contains: filters.search } },
        { email: { contains: filters.search } },
        { position: { contains: filters.search } },
      ];
    }
    return safePrisma(() =>
      prisma.employee.findMany({
        where,
        include: {
          manager: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { directReports: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Update an employee.
   */
  async update(id: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    position?: string;
    department?: string;
    managerId?: string | null;
    employmentType?: string;
    status?: string;
    hireDate?: Date | null;
    terminationDate?: Date | null;
    salary?: number;
    salaryCurrency?: string;
    payFrequency?: string;
    location?: string;
    timezone?: string;
    address?: string;
    emergencyContact?: EmergencyContact;
    documents?: EmployeeDocument[];
    skills?: EmployeeSkill[];
    notes?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName.slice(0, 200);
    if (data.lastName !== undefined) updateData.lastName = data.lastName.slice(0, 200);
    if (data.email !== undefined) updateData.email = data.email.slice(0, 500);
    if (data.phone !== undefined) updateData.phone = data.phone?.slice(0, 100) || null;
    if (data.avatar !== undefined) updateData.avatar = data.avatar || null;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.managerId !== undefined) updateData.managerId = data.managerId || null;
    if (data.employmentType !== undefined) updateData.employmentType = data.employmentType;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.hireDate !== undefined) updateData.hireDate = data.hireDate;
    if (data.terminationDate !== undefined) updateData.terminationDate = data.terminationDate;
    if (data.salary !== undefined) updateData.salary = data.salary;
    if (data.salaryCurrency !== undefined) updateData.salaryCurrency = data.salaryCurrency;
    if (data.payFrequency !== undefined) updateData.payFrequency = data.payFrequency;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.emergencyContact !== undefined) updateData.emergencyContact = serializeJson(data.emergencyContact);
    if (data.documents !== undefined) updateData.documents = serializeJson(data.documents);
    if (data.skills !== undefined) updateData.skills = serializeJson(data.skills);
    if (data.notes !== undefined) updateData.notes = data.notes;

    return prisma.employee.update({ where: { id }, data: updateData });
  },

  /**
   * Delete an employee.
   */
  async delete(id: string) {
    return prisma.employee.delete({ where: { id } });
  },

  /**
   * Get an employee by their linked user ID.
   */
  async getByUserId(userId: string) {
    return safePrisma(() =>
      prisma.employee.findFirst({
        where: { userId },
      }),
    null);
  },

  /**
   * Get direct reports for a manager.
   */
  async getDirectReports(managerId: string) {
    return safePrisma(() =>
      prisma.employee.findMany({
        where: { managerId },
        orderBy: { lastName: 'asc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get the org chart starting from top-level employees (no manager).
   * Returns a nested tree structure.
   */
  async getOrgChart(organizationId: string) {
    const all = await safePrisma(() =>
      prisma.employee.findMany({
        where: { organizationId, status: { not: 'terminated' } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          position: true,
          department: true,
          managerId: true,
          avatar: true,
        },
        orderBy: { lastName: 'asc' },
      }),
    []);

    const byManager = new Map<string | null, typeof all>();
    for (const emp of all) {
      const key = emp.managerId;
      const arr = byManager.get(key) ?? [];
      arr.push(emp);
      byManager.set(key, arr);
    }

    function buildChildren(parentId: string | null): unknown[] {
      const children = byManager.get(parentId) ?? [];
      return children.map((emp) => ({
        ...emp,
        children: buildChildren(emp.id),
      }));
    }

    return buildChildren(null);
  },

  /**
   * Get a list of distinct departments in an organization.
   */
  async getDepartments(organizationId: string) {
    const employees = await safePrisma(() =>
      prisma.employee.findMany({
        where: { organizationId },
        select: { department: true },
        distinct: ['department'],
      }),
    []);
    return employees
      .map((e) => e.department)
      .filter((d) => d && d.length > 0)
      .sort();
  },

  /**
   * Get aggregate stats for employees in an organization.
   */
  async getStats(organizationId: string) {
    const employees = await safePrisma(() =>
      prisma.employee.findMany({
        where: { organizationId },
        select: { status: true, department: true, employmentType: true, salary: true, salaryCurrency: true },
      }),
    []);

    const byStatus: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};
    const byEmploymentType: Record<string, number> = {};
    let totalSalary = 0;
    let salaryCount = 0;

    for (const emp of employees) {
      byStatus[emp.status] = (byStatus[emp.status] || 0) + 1;
      if (emp.department) {
        byDepartment[emp.department] = (byDepartment[emp.department] || 0) + 1;
      }
      byEmploymentType[emp.employmentType] = (byEmploymentType[emp.employmentType] || 0) + 1;
      if (emp.salary != null) {
        totalSalary += emp.salary;
        salaryCount += 1;
      }
    }

    return {
      total: employees.length,
      byStatus,
      byDepartment,
      byEmploymentType,
      averageSalary: salaryCount > 0 ? totalSalary / salaryCount : 0,
      activeCount: byStatus['active'] || 0,
    };
  },

  /**
   * Set or change an employee's manager.
   */
  async setManager(id: string, managerId: string | null) {
    return prisma.employee.update({
      where: { id },
      data: { managerId },
    });
  },

  /**
   * Terminate an employee (set status + termination date).
   */
  async terminate(id: string, terminationDate?: Date) {
    return prisma.employee.update({
      where: { id },
      data: {
        status: 'terminated',
        terminationDate: terminationDate || new Date(),
      },
    });
  },

  /**
   * Reactivate a previously terminated employee.
   */
  async reactivate(id: string) {
    return prisma.employee.update({
      where: { id },
      data: {
        status: 'active',
        terminationDate: null,
      },
    });
  },

  /**
   * Add a document to an employee's documents array.
   */
  async addDocument(id: string, document: EmployeeDocument) {
    const employee = await prisma.employee.findUnique({ where: { id }, select: { documents: true } });
    if (!employee) throw new Error('Employee not found');
    const docs = parseJson<EmployeeDocument[]>(employee.documents, []);
    docs.push(document);
    return prisma.employee.update({
      where: { id },
      data: { documents: serializeJson(docs) },
    });
  },

  /**
   * Remove a document from an employee's documents array by URL.
   */
  async removeDocument(id: string, url: string) {
    const employee = await prisma.employee.findUnique({ where: { id }, select: { documents: true } });
    if (!employee) throw new Error('Employee not found');
    const docs = parseJson<EmployeeDocument[]>(employee.documents, []);
    const filtered = docs.filter((d) => d.url !== url);
    return prisma.employee.update({
      where: { id },
      data: { documents: serializeJson(filtered) },
    });
  },

  /**
   * Add a skill to an employee's skills array.
   */
  async addSkill(id: string, skill: EmployeeSkill) {
    const employee = await prisma.employee.findUnique({ where: { id }, select: { skills: true } });
    if (!employee) throw new Error('Employee not found');
    const skills = parseJson<EmployeeSkill[]>(employee.skills, []);
    skills.push(skill);
    return prisma.employee.update({
      where: { id },
      data: { skills: serializeJson(skills) },
    });
  },

  /**
   * Get the onboarding checklist for a new employee.
   */
  async getOnboardingChecklist(id: string) {
    const employee = await safePrisma(() =>
      prisma.employee.findUnique({
        where: { id },
        select: { id: true, firstName: true, lastName: true, hireDate: true, status: true, documents: true, emergencyContact: true, address: true },
      }),
    null);
    if (!employee) return null;

    const docs = parseJson<EmployeeDocument[]>(employee.documents, []);
    const contact = parseJson<EmergencyContact>(employee.emergencyContact, {});

    return {
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        hireDate: employee.hireDate,
        status: employee.status,
      },
      checklist: [
        { id: 'profile', label: 'Complete employee profile', completed: !!employee.firstName && !!employee.lastName },
        { id: 'emergency_contact', label: 'Add emergency contact', completed: !!(contact.name || contact.phone) },
        { id: 'address', label: 'Add home address', completed: !!employee.address },
        { id: 'documents', label: 'Upload required documents', completed: docs.length > 0 },
        { id: 'hire_date', label: 'Set hire date', completed: !!employee.hireDate },
      ],
    };
  },

  /**
   * Update onboarding progress (re-derive checklist state).
   */
  async updateOnboardingProgress(id: string, data: {
    address?: string;
    emergencyContact?: EmergencyContact;
    hireDate?: Date;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.address !== undefined) updateData.address = data.address;
    if (data.emergencyContact !== undefined) updateData.emergencyContact = serializeJson(data.emergencyContact);
    if (data.hireDate !== undefined) updateData.hireDate = data.hireDate;
    return prisma.employee.update({ where: { id }, data: updateData });
  },
};
