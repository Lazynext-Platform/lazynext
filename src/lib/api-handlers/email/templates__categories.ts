import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EmailTemplateService } from '@/lib/services/email-template-service';

/** GET /api/email/templates/categories — list template categories */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ categories: [] });
  }

  const categories = await EmailTemplateService.getCategories(workspaces[0].id);
  return NextResponse.json({ categories });
}
