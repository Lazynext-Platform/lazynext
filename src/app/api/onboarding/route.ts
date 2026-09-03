import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/onboarding — complete the onboarding wizard.
 * Creates workspace (if needed), first project, and optionally a welcome document.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceName?: string;
    projectName?: string;
    projectDescription?: string;
    skipProject?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    // Ensure user has a workspace — rename it if they provide a custom name
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    let workspace = workspaces[0];

    if (!workspace) {
      workspace = await WorkspaceService.ensureDefaultWorkspace(session.user.id, session.user.name);
    }

    // Rename workspace if a custom name is provided
    if (body.workspaceName?.trim() && body.workspaceName !== workspace.name) {
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { name: body.workspaceName.trim() },
      });
    }

    let project = null;

    // Create first project if requested
    if (!body.skipProject && body.projectName?.trim()) {
      project = await prisma.project.create({
        data: {
          workspaceId: workspace.id,
          createdById: session.user.id,
          name: body.projectName.trim(),
          description: body.projectDescription?.trim() || null,
          status: 'active',
        },
      });

      // Create a welcome document in the project
      await prisma.document.create({
        data: {
          workspaceId: workspace.id,
          createdById: session.user.id,
          projectId: project.id,
          title: 'Welcome to your workspace',
          content: `# Welcome to ${body.workspaceName || workspace.name}!\n\nThis is your first document. You can edit it, delete it, or create new ones.\n\n## Getting started\n- Create tasks in your project\n- Upload files\n- Explore the calendar\n- Set up automations\n\nEnjoy using Lazynext!`,
          version: 1,
        },
      });

      // Create a welcome notification
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          workspaceId: workspace.id,
          type: 'welcome',
          title: 'Welcome to Lazynext!',
          body: 'Your workspace is ready. Start by creating a project or exploring the dashboard.',
        },
      });
    }

    // Mark onboarding as complete by updating the user's name if needed
    // Onboarding state is inferred from workspace/project existence
    return NextResponse.json({
      ok: true,
      workspaceId: workspace.id,
      projectId: project?.id || null,
    });
  } catch (e) {
    console.error('[onboarding] error:', e);
    return NextResponse.json(
      { error: 'onboarding_failed' },
      { status: 500 },
    );
  }
}
