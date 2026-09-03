import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/settings/export — export all of the user's personal data as JSON.
 * Implements GDPR right to data portability.
 *
 * Returns a JSON file containing the user's profile, projects, tasks,
 * documents, creations, notifications, conversations, and audit events.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Fetch all user data in parallel
  const [
    user,
    projects,
    tasks,
    documents,
    creations,
    notifications,
    conversations,
    auditEvents,
    ledger,
    apiKeys,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, image: true,
        locale: true, country: true, currency: true,
        credits: true, createdAt: true, emailVerified: true,
        notificationPrefs: true,
      },
    }),
    prisma.project.findMany({
      where: { createdById: userId, deletedAt: null },
      select: { id: true, name: true, description: true, status: true, createdAt: true, updatedAt: true },
    }),
    prisma.task.findMany({
      where: { assigneeId: userId, deletedAt: null },
      select: { id: true, title: true, description: true, status: true, priority: true, dueDate: true, createdAt: true, updatedAt: true },
    }),
    prisma.document.findMany({
      where: { createdById: userId, deletedAt: null },
      select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
    }),
    prisma.creation.findMany({
      where: { userId },
      select: { id: true, templateId: true, status: true, prompt: true, outputs: true, createdAt: true },
    }),
    prisma.notification.findMany({
      where: { userId },
      select: { id: true, type: true, title: true, body: true, read: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.message.findMany({
      where: { userId },
      select: { id: true, body: true, createdAt: true, conversationId: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.auditEvent.findMany({
      where: { userId },
      select: { id: true, action: true, targetType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.creditLedger.findMany({
      where: { userId },
      select: { id: true, delta: true, reason: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.apiKey.findMany({
      where: { userId },
      select: { id: true, name: true, scopes: true, createdAt: true, lastUsedAt: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    platform: 'Lazynext',
    version: '1.0',
    user,
    projects,
    tasks,
    documents,
    creations,
    notifications,
    messages: conversations,
    auditEvents,
    creditLedger: ledger,
    apiKeys,
  };

  const jsonStr = JSON.stringify(exportData, null, 2);

  return new NextResponse(jsonStr, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="lazynext-data-export-${userId}.json"`,
      'Cache-Control': 'no-cache',
    },
  });
}
