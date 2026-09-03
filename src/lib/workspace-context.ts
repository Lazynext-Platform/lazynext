import { headers, cookies } from 'next/headers';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { WorkspaceService, type WorkspaceWithRole } from '@/lib/services/workspace';

export interface WorkspaceContext {
  userId: string;
  workspaceId: string;
  role: string;
  workspace: WorkspaceWithRole;
}

/**
 * Resolve the current workspace context for server-side rendering.
 * Reads the workspace ID from the `lazynext-ws` cookie, falls back to
 * the user's first workspace, and ensures a default workspace exists.
 * Returns null if the user is not authenticated.
 */
export async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  // Ensure the user has at least one workspace
  const workspaces = await WorkspaceService.listForUser(userId);
  let activeWorkspace: WorkspaceWithRole | undefined;

  if (workspaces.length === 0) {
    // Create a default workspace
    const ws = await WorkspaceService.ensureDefaultWorkspace(userId, session.user.name);
    activeWorkspace = ws;
  } else {
    // Try the cookie
    const wsCookie = (await cookies()).get('lazynext-ws')?.value;
    if (wsCookie) {
      activeWorkspace = workspaces.find((w) => w.id === wsCookie);
    }
    // Fall back to the first workspace
    if (!activeWorkspace) {
      activeWorkspace = workspaces[0];
    }
  }

  if (!activeWorkspace) return null;

  return {
    userId,
    workspaceId: activeWorkspace.id,
    role: activeWorkspace.role,
    workspace: activeWorkspace,
  };
}

/**
 * Verify that the current user is a member of the given workspace.
 * Returns the membership or null.
 */
export async function verifyWorkspaceMembership(workspaceId: string, userId: string) {
  return prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}

/**
 * Require workspace context. Throws if not authenticated.
 */
export async function requireWorkspaceContext(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext();
  if (!ctx) throw new Error('Unauthorized: no workspace context');
  return ctx;
}

/**
 * Require a specific role in the current workspace.
 */
export async function requireRole(roles: string[]): Promise<WorkspaceContext> {
  const ctx = await requireWorkspaceContext();
  if (!roles.includes(ctx.role)) {
    throw new Error(`Forbidden: requires one of ${roles.join(', ')}`);
  }
  return ctx;
}
