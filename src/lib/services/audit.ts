import { prisma } from '@/lib/prisma';

export interface AuditEventInput {
  userId?: string;
  workspaceId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Centralized audit event logging service.
 * All security-relevant actions should be logged via this service.
 */
export const AuditService = {
  async log(event: AuditEventInput): Promise<void> {
    try {
      await prisma.auditEvent.create({
        data: {
          userId: event.userId || null,
          workspaceId: event.workspaceId || null,
          action: event.action,
          targetType: event.targetType || null,
          targetId: event.targetId || null,
          metadata: event.metadata ? JSON.stringify(event.metadata) : null,
          ip: event.ip || null,
          userAgent: event.userAgent || null,
        },
      });
    } catch {
      // Audit logging should never break the request
    }
  },

  async listForWorkspace(workspaceId: string, limit = 50): Promise<readonly unknown[]> {
    return prisma.auditEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async listForUser(userId: string, limit = 50): Promise<readonly unknown[]> {
    return prisma.auditEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};

// Common audit actions
export const AuditActions = {
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_FAILED: 'auth.failed',
  AUTH_SIGNUP: 'auth.signup',

  API_KEY_CREATE: 'api_key.create',
  API_KEY_REVOKE: 'api_key.revoke',
  API_KEY_USE: 'api_key.use',

  WORKSPACE_CREATE: 'workspace.create',
  WORKSPACE_UPDATE: 'workspace.update',
  WORKSPACE_DELETE: 'workspace.delete',

  MEMBER_ADD: 'member.add',
  MEMBER_REMOVE: 'member.remove',
  MEMBER_ROLE_UPDATE: 'member.role_update',

  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',

  TASK_CREATE: 'task.create',
  TASK_UPDATE: 'task.update',
  TASK_DELETE: 'task.delete',

  DOCUMENT_CREATE: 'document.create',
  DOCUMENT_UPDATE: 'document.update',
  DOCUMENT_DELETE: 'document.delete',

  FILE_UPLOAD: 'file.upload',
  FILE_DELETE: 'file.delete',

  AUTOMATION_CREATE: 'automation.create',
  AUTOMATION_UPDATE: 'automation.update',
  AUTOMATION_DELETE: 'automation.delete',

  AGENT_CREATE: 'agent.create',
  AGENT_RUN: 'agent.run',

  MCP_REQUEST: 'mcp.request',

  API_REQUEST: 'api.request',
} as const;
