/**
 * Tenant Guard Service — workspace ownership verification for ID-only lookups.
 *
 * Each method checks that a resource belongs to (or is accessible from) the
 * given workspace, preventing cross-tenant data leakage on ID-only API routes.
 *
 * Returns true if the resource is owned by the workspace, false otherwise
 * (including when the resource does not exist).
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

export const TenantGuardService = {
  /**
   * Verify that a task belongs to a workspace via task.project.workspaceId.
   */
  async verifyTaskOwnership(taskId: string, workspaceId: string): Promise<boolean> {
    const task = await safePrisma(() =>
      prisma.task.findUnique({
        where: { id: taskId },
        select: { project: { select: { workspaceId: true } } },
      }),
    null);
    if (!task) return false;
    return task.project.workspaceId === workspaceId;
  },

  /**
   * Verify that a customer belongs to a workspace.
   * Checks customer.workspaceId (if set) or customer.organizationId matches
   * the workspace's organization.
   */
  async verifyCustomerOwnership(customerId: string, workspaceId: string): Promise<boolean> {
    const customer = await safePrisma(() =>
      prisma.customer.findUnique({
        where: { id: customerId },
        select: { workspaceId: true, organizationId: true },
      }),
    null);
    if (!customer) return false;
    if (customer.workspaceId === workspaceId) return true;
    // Fallback: check organization match
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      }),
    null);
    if (!workspace) return false;
    return customer.organizationId === workspace.organizationId;
  },

  /**
   * Verify that a deal belongs to a workspace.
   * Checks deal.workspaceId (if set) or deal.organizationId matches.
   */
  async verifyDealOwnership(dealId: string, workspaceId: string): Promise<boolean> {
    const deal = await safePrisma(() =>
      prisma.deal.findUnique({
        where: { id: dealId },
        select: { workspaceId: true, organizationId: true },
      }),
    null);
    if (!deal) return false;
    if (deal.workspaceId === workspaceId) return true;
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      }),
    null);
    if (!workspace) return false;
    return deal.organizationId === workspace.organizationId;
  },

  /**
   * Verify that a plan belongs to a workspace.
   * Checks plan.workspaceId.
   */
  async verifyPlanOwnership(planId: string, workspaceId: string): Promise<boolean> {
    const plan = await safePrisma(() =>
      prisma.plan.findUnique({
        where: { id: planId },
        select: { workspaceId: true },
      }),
    null);
    if (!plan) return false;
    return plan.workspaceId === workspaceId;
  },

  /**
   * Verify that a goal belongs to a workspace.
   * Checks goal.workspaceId (if set) or goal.organizationId matches.
   */
  async verifyGoalOwnership(goalId: string, workspaceId: string): Promise<boolean> {
    const goal = await safePrisma(() =>
      prisma.goal.findUnique({
        where: { id: goalId },
        select: { workspaceId: true, organizationId: true },
      }),
    null);
    if (!goal) return false;
    if (goal.workspaceId === workspaceId) return true;
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      }),
    null);
    if (!workspace) return false;
    return goal.organizationId === workspace.organizationId;
  },

  /**
   * Verify that an approval belongs to a workspace.
   * Checks approval.workspaceId.
   */
  async verifyApprovalOwnership(approvalId: string, workspaceId: string): Promise<boolean> {
    const approval = await safePrisma(() =>
      prisma.approval.findUnique({
        where: { id: approvalId },
        select: { workspaceId: true },
      }),
    null);
    if (!approval) return false;
    return approval.workspaceId === workspaceId;
  },

  /**
   * Verify that a memory belongs to a workspace.
   * Checks memory.workspaceId.
   */
  async verifyMemoryOwnership(memoryId: string, workspaceId: string): Promise<boolean> {
    const memory = await safePrisma(() =>
      prisma.memory.findUnique({
        where: { id: memoryId },
        select: { workspaceId: true },
      }),
    null);
    if (!memory) return false;
    return memory.workspaceId === workspaceId;
  },

  /**
   * Verify that a knowledge base belongs to a workspace.
   * Checks knowledgeBase.workspaceId.
   */
  async verifyKnowledgeBaseOwnership(kbId: string, workspaceId: string): Promise<boolean> {
    const kb = await safePrisma(() =>
      prisma.knowledgeBase.findUnique({
        where: { id: kbId },
        select: { workspaceId: true },
      }),
    null);
    if (!kb) return false;
    return kb.workspaceId === workspaceId;
  },

  /**
   * Verify that an automation belongs to a workspace.
   * Checks automation.workspaceId.
   */
  async verifyAutomationOwnership(automationId: string, workspaceId: string): Promise<boolean> {
    const automation = await safePrisma(() =>
      prisma.automation.findUnique({
        where: { id: automationId },
        select: { workspaceId: true },
      }),
    null);
    if (!automation) return false;
    return automation.workspaceId === workspaceId;
  },

  /**
   * Verify that a ticket belongs to a workspace.
   * Checks ticket.workspaceId (if set) or ticket.organizationId matches.
   */
  async verifyTicketOwnership(ticketId: string, workspaceId: string): Promise<boolean> {
    const ticket = await safePrisma(() =>
      prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { workspaceId: true, organizationId: true },
      }),
    null);
    if (!ticket) return false;
    if (ticket.workspaceId === workspaceId) return true;
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      }),
    null);
    if (!workspace) return false;
    return ticket.organizationId === workspace.organizationId;
  },

  /**
   * Verify that an agent run belongs to a workspace.
   * Checks agentRun.agent.workspaceId.
   */
  async verifyAgentRunOwnership(runId: string, workspaceId: string): Promise<boolean> {
    const run = await safePrisma(() =>
      prisma.agentRun.findUnique({
        where: { id: runId },
        select: { agent: { select: { workspaceId: true } } },
      }),
    null);
    if (!run) return false;
    return run.agent.workspaceId === workspaceId;
  },

  /**
   * Verify that a tool belongs to a workspace.
   * Checks toolDef.workspaceId.
   */
  async verifyToolOwnership(toolId: string, workspaceId: string): Promise<boolean> {
    const tool = await safePrisma(() =>
      prisma.toolDef.findUnique({
        where: { id: toolId },
        select: { workspaceId: true },
      }),
    null);
    if (!tool) return false;
    return tool.workspaceId === workspaceId;
  },

  /**
   * Verify that a sandbox run belongs to a workspace.
   * Checks sandboxRun.workspaceId.
   */
  async verifySandboxRunOwnership(runId: string, workspaceId: string): Promise<boolean> {
    const run = await safePrisma(() =>
      prisma.sandboxRun.findUnique({
        where: { id: runId },
        select: { workspaceId: true },
      }),
    null);
    if (!run) return false;
    return run.workspaceId === workspaceId;
  },

  /**
   * Verify that a security event belongs to a workspace.
   * Checks securityEvent.workspaceId.
   */
  async verifySecurityEventOwnership(eventId: string, workspaceId: string): Promise<boolean> {
    const event = await safePrisma(() =>
      prisma.securityEvent.findUnique({
        where: { id: eventId },
        select: { workspaceId: true },
      }),
    null);
    if (!event) return false;
    return event.workspaceId === workspaceId;
  },
};
