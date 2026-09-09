/**
 * Agent Communication Service — inter-agent messaging and assistance requests.
 *
 * Enables agents to communicate with each other through:
 * - Direct messages (request, response, notification, question)
 * - Broadcasts to multiple agents
 * - Assistance requests with sub-task creation
 * - Responses to assistance requests
 *
 * Messages are stored as Memory records with type 'decision' and tags
 * ['agent_message', <messageType>]. This avoids schema changes while
 * providing a queryable record of all inter-agent communication.
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { MemoryService } from '@/lib/services/memory';
import { EventService } from '@/lib/services/event';

// ── Types ──

export type MessageType = 'request' | 'response' | 'notification' | 'question';

export interface SendMessageInput {
  fromAgentId: string;
  toAgentId: string;
  type: MessageType;
  content: string;
  taskId?: string;
  collaborationId?: string;
}

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: MessageType;
  content: string;
  taskId?: string;
  collaborationId?: string;
  createdAt: string;
}

export interface GetMessagesOpts {
  direction?: 'sent' | 'received';
  type?: MessageType;
  since?: Date;
  until?: Date;
  take?: number;
}

export interface BroadcastInput {
  fromAgentId: string;
  toAgentIds: string[];
  type: MessageType;
  content: string;
  collaborationId?: string;
}

export interface RequestAssistanceInput {
  fromAgentId: string;
  toAgentId: string;
  taskId: string;
  requestType: string;
  description: string;
}

export interface AssistanceRequest {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  taskId: string;
  requestType: string;
  description: string;
  status: string; // pending | accepted | declined | completed
  result?: string;
  createdAt: string;
}

export interface RespondToAssistanceInput {
  requestId: string;
  fromAgentId: string;
  response: 'accepted' | 'declined' | 'completed';
  result?: string;
}

// ── Helpers ──

/**
 * Parse an agent message from a Memory row.
 * The message metadata is stored in the Memory's content as JSON.
 */
function parseMessageFromMemory(memory: {
  id: string;
  content: string;
  owner: string | null;
  sourceId: string | null;
  tags: string;
  createdAt: Date;
}): AgentMessage | null {
  try {
    const meta = JSON.parse(memory.content) as {
      fromAgentId?: string;
      toAgentId?: string;
      type?: MessageType;
      content?: string;
      taskId?: string;
      collaborationId?: string;
    };
    return {
      id: memory.id,
      fromAgentId: meta.fromAgentId || '',
      toAgentId: meta.toAgentId || memory.owner || '',
      type: meta.type || 'notification',
      content: meta.content || '',
      taskId: meta.taskId,
      collaborationId: meta.collaborationId,
      createdAt: memory.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Serialize a message into the content string for storage.
 */
function serializeMessage(input: SendMessageInput): string {
  return JSON.stringify({
    fromAgentId: input.fromAgentId,
    toAgentId: input.toAgentId,
    type: input.type,
    content: input.content,
    taskId: input.taskId || null,
    collaborationId: input.collaborationId || null,
  });
}

// ── Agent Communication Service ──

export const AgentCommunication = {
  /**
   * Send a message from one agent to another.
   * Stored as a Memory with type 'decision' and tags ['agent_message', <type>].
   */
  async sendMessage(
    workspaceId: string,
    input: SendMessageInput,
  ): Promise<AgentMessage> {
    const correlationId = `agent-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const organizationId = await this.getOrganizationId(workspaceId);

    // 1. Store the message as a Memory
    const memory = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'decision',
        content: serializeMessage(input).slice(0, 10000),
        source: 'agent',
        sourceId: input.collaborationId || input.taskId || null,
        confidence: 0.8,
        owner: input.toAgentId,
        lifecycle: 'short',
        tags: JSON.stringify(['agent_message', input.type, input.fromAgentId, input.toAgentId]),
        createdBy: input.fromAgentId,
      },
    });

    // 2. Emit event
    await EventService.emit({
      workspaceId,
      organizationId,
      type: 'agent.message_sent',
      actor: input.fromAgentId,
      actorType: 'agent',
      resourceType: 'memory',
      resourceId: memory.id,
      metadata: {
        fromAgentId: input.fromAgentId,
        toAgentId: input.toAgentId,
        messageType: input.type,
        taskId: input.taskId,
        collaborationId: input.collaborationId,
      },
      correlationId,
    }).catch(() => {});

    return {
      id: memory.id,
      fromAgentId: input.fromAgentId,
      toAgentId: input.toAgentId,
      type: input.type,
      content: input.content,
      taskId: input.taskId,
      collaborationId: input.collaborationId,
      createdAt: memory.createdAt.toISOString(),
    };
  },

  /**
   * Get messages for an agent.
   * Filter by direction (sent/received), type, and date range.
   */
  async getMessages(
    workspaceId: string,
    agentId: string,
    opts?: GetMessagesOpts,
  ): Promise<AgentMessage[]> {
    const take = Math.min(opts?.take || 100, 500);

    // Fetch memories with 'agent_message' tag
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'decision',
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(take * 2, 1000), // over-fetch since we filter by tags in app
      }),
    []);

    const messages: AgentMessage[] = [];
    for (const m of memories) {
      const tags = JSON.parse(m.tags || '[]') as string[];
      if (!tags.includes('agent_message')) continue;

      const parsed = parseMessageFromMemory(m);
      if (!parsed) continue;

      // Filter by direction
      if (opts?.direction === 'sent' && parsed.fromAgentId !== agentId) continue;
      if (opts?.direction === 'received' && parsed.toAgentId !== agentId) continue;
      if (!opts?.direction && parsed.fromAgentId !== agentId && parsed.toAgentId !== agentId) continue;

      // Filter by type
      if (opts?.type && parsed.type !== opts.type) continue;

      // Filter by date range
      if (opts?.since && new Date(parsed.createdAt) < opts.since) continue;
      if (opts?.until && new Date(parsed.createdAt) > opts.until) continue;

      messages.push(parsed);
      if (messages.length >= take) break;
    }

    return messages;
  },

  /**
   * Get conversation between two agents.
   */
  async getConversation(
    workspaceId: string,
    agent1Id: string,
    agent2Id: string,
    opts?: { since?: Date; take?: number },
  ): Promise<AgentMessage[]> {
    const take = Math.min(opts?.take || 100, 500);

    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'decision',
        },
        orderBy: { createdAt: 'asc' },
        take: Math.min(take * 2, 1000),
      }),
    []);

    const conversation: AgentMessage[] = [];
    for (const m of memories) {
      const tags = JSON.parse(m.tags || '[]') as string[];
      if (!tags.includes('agent_message')) continue;

      const parsed = parseMessageFromMemory(m);
      if (!parsed) continue;

      // Must involve both agents (in either direction)
      const involvesBoth =
        (parsed.fromAgentId === agent1Id && parsed.toAgentId === agent2Id) ||
        (parsed.fromAgentId === agent2Id && parsed.toAgentId === agent1Id);
      if (!involvesBoth) continue;

      if (opts?.since && new Date(parsed.createdAt) < opts.since) continue;

      conversation.push(parsed);
      if (conversation.length >= take) break;
    }

    return conversation;
  },

  /**
   * Broadcast a message to multiple agents.
   * Creates a message for each recipient.
   */
  async broadcastMessage(
    workspaceId: string,
    input: BroadcastInput,
  ): Promise<{ count: number; messages: AgentMessage[] }> {
    const messages: AgentMessage[] = [];

    for (const toAgentId of input.toAgentIds) {
      const message = await this.sendMessage(workspaceId, {
        fromAgentId: input.fromAgentId,
        toAgentId,
        type: input.type,
        content: input.content,
        collaborationId: input.collaborationId,
      }).catch(() => null);

      if (message) {
        messages.push(message);
      }
    }

    return { count: messages.length, messages };
  },

  /**
   * An agent requests assistance from another.
   * Creates a message and a sub-task for the requested agent.
   */
  async requestAssistance(
    workspaceId: string,
    input: RequestAssistanceInput,
  ): Promise<AssistanceRequest> {
    const correlationId = `assist-req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const organizationId = await this.getOrganizationId(workspaceId);

    // 1. Send a message to the target agent
    const message = await this.sendMessage(workspaceId, {
      fromAgentId: input.fromAgentId,
      toAgentId: input.toAgentId,
      type: 'request',
      content: `Assistance requested: ${input.requestType}. ${input.description}`,
      taskId: input.taskId,
    });

    // 2. Create a sub-task for the requested agent
    // Find the parent task to get the projectId
    const parentTask = await safePrisma(() =>
      prisma.task.findUnique({
        where: { id: input.taskId },
        select: { projectId: true, title: true },
      }),
    null);

    let subTaskId = '';
    if (parentTask) {
      const subTask = await prisma.task.create({
        data: {
          projectId: parentTask.projectId,
          parentTaskId: input.taskId,
          title: `Assistance: ${input.requestType}`.slice(0, 300),
          description: input.description.slice(0, 5000),
          status: 'todo',
          priority: 'high',
          assignedAgentId: input.toAgentId,
        },
      }).catch(() => null);
      subTaskId = subTask?.id || '';
    }

    // 3. Record the assistance request as a memory
    const requestMemory = await MemoryService.create({
      workspaceId,
      organizationId,
      type: 'decision',
      content: JSON.stringify({
        type: 'assistance_request',
        fromAgentId: input.fromAgentId,
        toAgentId: input.toAgentId,
        taskId: input.taskId,
        subTaskId,
        requestType: input.requestType,
        description: input.description,
        status: 'pending',
        messageId: message.id,
      }).slice(0, 10000),
      source: 'agent',
      sourceId: input.taskId,
      confidence: 0.8,
      owner: input.toAgentId,
      lifecycle: 'medium',
      tags: ['agent_message', 'assistance_request', input.fromAgentId, input.toAgentId],
      createdBy: input.fromAgentId,
    }).catch(() => null);

    const requestId = requestMemory?.id || message.id;

    // 4. Emit event
    await EventService.emit({
      workspaceId,
      organizationId,
      type: 'agent.assistance_requested',
      actor: input.fromAgentId,
      actorType: 'agent',
      resourceType: 'task',
      resourceId: input.taskId,
      metadata: {
        requestId,
        fromAgentId: input.fromAgentId,
        toAgentId: input.toAgentId,
        requestType: input.requestType,
        taskId: input.taskId,
      },
      correlationId,
    }).catch(() => {});

    return {
      id: requestId,
      fromAgentId: input.fromAgentId,
      toAgentId: input.toAgentId,
      taskId: input.taskId,
      requestType: input.requestType,
      description: input.description,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * Respond to an assistance request.
   * Updates the request status and notifies the requesting agent.
   */
  async respondToAssistance(
    workspaceId: string,
    input: RespondToAssistanceInput,
  ): Promise<{
    id: string;
    requestId: string;
    fromAgentId: string;
    response: string;
    result?: string;
    status: string;
    createdAt: string;
  }> {
    const correlationId = `assist-resp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const organizationId = await this.getOrganizationId(workspaceId);

    // 1. Load the assistance request memory
    const requestMemory = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: input.requestId } }),
    null);

    let requestData: {
      fromAgentId?: string;
      toAgentId?: string;
      taskId?: string;
      requestType?: string;
      description?: string;
      status?: string;
    } = {};

    if (requestMemory) {
      try {
        requestData = JSON.parse(requestMemory.content) as typeof requestData;
      } catch {
        // keep empty
      }
    }

    // 2. Update the request status
    const newStatus = input.response; // accepted | declined | completed
    if (requestMemory) {
      const updatedContent = JSON.stringify({
        ...requestData,
        status: newStatus,
        response: input.response,
        result: input.result || '',
        respondedAt: new Date().toISOString(),
      }).slice(0, 10000);

      await prisma.memory.update({
        where: { id: input.requestId },
        data: { content: updatedContent },
      }).catch(() => {});
    }

    // 3. Notify the requesting agent
    const originalRequester = requestData.fromAgentId || '';
    if (originalRequester) {
      await this.sendMessage(workspaceId, {
        fromAgentId: input.fromAgentId,
        toAgentId: originalRequester,
        type: 'response',
        content: `Assistance request ${input.response}: ${input.result || 'No additional details'}`,
        taskId: requestData.taskId,
      }).catch(() => {});
    }

    // 4. Record the response as a memory
    const responseMemory = await MemoryService.create({
      workspaceId,
      organizationId,
      type: 'decision',
      content: JSON.stringify({
        type: 'assistance_response',
        requestId: input.requestId,
        fromAgentId: input.fromAgentId,
        response: input.response,
        result: input.result || '',
        status: newStatus,
      }).slice(0, 10000),
      source: 'agent',
      sourceId: input.requestId,
      confidence: 0.9,
      owner: originalRequester || undefined,
      lifecycle: 'medium',
      tags: ['agent_message', 'assistance_response', input.requestId],
      createdBy: input.fromAgentId,
    }).catch(() => null);

    // 5. Emit event
    await EventService.emit({
      workspaceId,
      organizationId,
      type: 'agent.assistance_responded',
      actor: input.fromAgentId,
      actorType: 'agent',
      resourceType: 'memory',
      resourceId: input.requestId,
      metadata: {
        requestId: input.requestId,
        fromAgentId: input.fromAgentId,
        response: input.response,
        result: input.result?.slice(0, 500),
      },
      correlationId,
    }).catch(() => {});

    return {
      id: responseMemory?.id || `resp-${input.requestId}-${Date.now()}`,
      requestId: input.requestId,
      fromAgentId: input.fromAgentId,
      response: input.response,
      result: input.result,
      status: newStatus,
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * Helper: get the organizationId for a workspace.
   */
  async getOrganizationId(workspaceId: string): Promise<string> {
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      }),
    null);
    return workspace?.organizationId || '';
  },
};
