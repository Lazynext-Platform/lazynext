import { NextResponse } from 'next/server';

/**
 * GET /api/v1 — API root with OpenAPI metadata
 */
export async function GET() {
  return NextResponse.json({
    name: 'Lazynext API',
    version: '1.0.0',
    description: 'Public REST API for the Lazynext operating system.',
    baseUrl: '/api/v1',
    authentication: {
      type: 'bearer',
      description: 'Use API keys via the Authorization header: Bearer ln_live_...',
      keyManagement: '/api/keys',
    },
    endpoints: {
      workspaces: { list: 'GET /api/v1/workspaces', detail: 'GET /api/v1/workspaces/{id}' },
      projects: {
        list: 'GET /api/v1/workspaces/{id}/projects',
        create: 'POST /api/v1/workspaces/{id}/projects',
        detail: 'GET /api/v1/projects/{id}',
        update: 'PATCH /api/v1/projects/{id}',
        delete: 'DELETE /api/v1/projects/{id}',
      },
      tasks: {
        list: 'GET /api/v1/projects/{id}/tasks',
        create: 'POST /api/v1/projects/{id}/tasks',
        detail: 'GET /api/v1/tasks/{id}',
        update: 'PATCH /api/v1/tasks/{id}',
        delete: 'DELETE /api/v1/tasks/{id}',
      },
      documents: {
        list: 'GET /api/v1/workspaces/{id}/documents',
        create: 'POST /api/v1/workspaces/{id}/documents',
        detail: 'GET /api/v1/documents/{id}',
        update: 'PATCH /api/v1/documents/{id}',
        delete: 'DELETE /api/v1/documents/{id}',
      },
      files: {
        list: 'GET /api/v1/workspaces/{id}/files',
        detail: 'GET /api/v1/files/{id}',
        delete: 'DELETE /api/v1/files/{id}',
      },
    },
    rateLimits: {
      perIp: '100 requests per minute',
      headers: { rateLimited: '429 with Retry-After header' },
    },
    schemas: {
      Workspace: { id: 'string', name: 'string', slug: 'string', role: 'string' },
      Project: { id: 'string', workspaceId: 'string', name: 'string', description: 'string|null', status: 'string' },
      Task: { id: 'string', projectId: 'string', title: 'string', status: 'string', priority: 'string', dueDate: 'string|null' },
      Document: { id: 'string', workspaceId: 'string', title: 'string', content: 'string', version: 'number' },
      File: { id: 'string', workspaceId: 'string', name: 'string', mimeType: 'string', size: 'number' },
    },
  });
}
