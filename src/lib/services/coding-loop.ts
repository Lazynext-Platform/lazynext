/**
 * Coding Loop Service — orchestrates the durable coding loop:
 *   GitHub issue → create branch → generate code → create PR → verify → merge.
 *
 * This is a higher-level workflow service that uses the existing GitHubService
 * and agent runtime primitives. Each step persists state (Task, AgentRun, Memory,
 * Event) so the loop is durable and can be resumed after a crash.
 *
 * The loop mirrors the autonomous loop:
 *   Goal → Plan → Tasks → Auto-assign → Agent Run → Tool Calls → Verification → Memory
 * but specialized for code changes against a GitHub repository.
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { atlasChat, type ChatMessage } from '@/lib/atlas';
import { GitHubService, type GitHubIssue, type GitHubPR } from '@/lib/services/github';
import { MemoryService } from '@/lib/services/memory';
import { EventService } from '@/lib/services/event';

// ── Types ──

export interface StartCodingLoopInput {
  owner: string;
  repo: string;
  issueNumber: number;
  agentId?: string;
}

export interface GenerateCodeInput {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  issueContext: string;
  agentId?: string;
}

export interface CreatePullRequestInput {
  owner: string;
  repo: string;
  branch: string;
  base: string;
  title: string;
  body: string;
  issueNumber: number;
  taskId?: string;
}

export interface VerifyAndMergeInput {
  owner: string;
  repo: string;
  prNumber: number;
  taskId?: string;
}

export interface CodingLoopStatus {
  task: Record<string, unknown> | null;
  agentRun: Record<string, unknown> | null;
  branchName: string | null;
  prNumber: number | null;
  status: string;
}

// ── Helpers ──

/**
 * Convert an issue title into a URL-safe slug for branch names.
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'issue';
}

/**
 * Build a branch name from an issue number and title.
 */
function buildBranchName(issueNumber: number, title: string): string {
  return `fix/issue-${issueNumber}-${slugify(title)}`;
}

// ── Coding Loop Service ──

export const CodingLoopService = {
  /**
   * Start a coding loop for a GitHub issue.
   *
   * Steps:
   * 1. Fetch the GitHub issue details (title, body)
   * 2. Create a branch name from the issue
   * 3. Call GitHubService.createBranch to create the branch
   * 4. Create a Task for the coding work
   * 5. Create an AgentRun for the coding agent
   * 6. Record a Memory about the coding loop start
   * 7. Emit an Event
   * 8. Return { taskId, agentRunId, branchName, issue }
   */
  async startCodingLoop(
    workspaceId: string,
    userId: string,
    input: StartCodingLoopInput,
  ): Promise<{
    taskId: string;
    agentRunId: string;
    branchName: string;
    issue: GitHubIssue;
  }> {
    const correlationId = `coding-loop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 1. Fetch the GitHub issue
    const issue = await GitHubService.getIssue(userId, input.owner, input.repo, input.issueNumber);
    if (!issue) {
      throw new Error(`Issue #${input.issueNumber} not found in ${input.owner}/${input.repo}`);
    }

    // 2. Create a branch name
    const branchName = buildBranchName(input.issueNumber, issue.title);

    // 3. Create the branch
    const branchResult = await GitHubService.createBranch(
      userId,
      input.owner,
      input.repo,
      branchName,
    );
    if (!branchResult.ok) {
      throw new Error(`Failed to create branch: ${branchResult.error || 'unknown'}`);
    }

    // 4. Get the organization ID from the workspace
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      }),
    null);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    const organizationId = workspace.organizationId;

    // 5. Get or create a default project for the coding task
    const project = await this.getOrCreateCodingProject(workspaceId, userId);

    // 6. Create a Task for the coding work
    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        title: `Fix #${input.issueNumber}: ${issue.title}`.slice(0, 300),
        description: (issue.body || issue.title).slice(0, 5000),
        status: 'todo',
        priority: 'medium',
        riskLevel: 'low',
        assignedAgentId: input.agentId || null,
        inputs: JSON.stringify({
          codingLoop: true,
          owner: input.owner,
          repo: input.repo,
          issueNumber: input.issueNumber,
          branchName,
          issueTitle: issue.title,
        }),
      },
    });

    // 7. Create an AgentRun for the coding agent
    const agentRun = await prisma.agentRun.create({
      data: {
        agentId: input.agentId || 'coding-agent',
        taskId: task.id,
        status: 'pending',
        input: JSON.stringify({
          objective: `Fix issue #${input.issueNumber}: ${issue.title}`,
          owner: input.owner,
          repo: input.repo,
          branch: branchName,
          issueBody: (issue.body || '').slice(0, 2000),
        }).slice(0, 10000),
        idempotencyKey: `coding-loop-${task.id}`,
        startedAt: new Date(),
      },
    });

    // 8. Record a Memory about the coding loop start
    await MemoryService.create({
      workspaceId,
      organizationId,
      type: 'active_context',
      content: `Coding loop started for issue #${input.issueNumber}: ${issue.title}. Branch: ${branchName}. Repo: ${input.owner}/${input.repo}`,
      source: 'agent',
      sourceId: task.id,
      confidence: 0.8,
      lifecycle: 'medium',
      tags: ['coding-loop', 'github', 'issue'],
      createdBy: userId,
    }).catch(() => {});

    // 9. Emit an Event
    await EventService.emit({
      workspaceId,
      organizationId,
      type: 'coding_loop.started',
      actor: userId,
      actorType: 'user',
      resourceType: 'task',
      resourceId: task.id,
      metadata: {
        owner: input.owner,
        repo: input.repo,
        issueNumber: input.issueNumber,
        branchName,
        agentRunId: agentRun.id,
      },
      correlationId,
    }).catch(() => {});

    return {
      taskId: task.id,
      agentRunId: agentRun.id,
      branchName,
      issue,
    };
  },

  /**
   * Generate code for a specific file on a branch.
   *
   * Steps:
   * 1. Read the existing file (if any) via GitHubService.getFile
   * 2. Build a prompt with the issue context and existing code
   * 3. Call atlasChat to generate the new code
   * 4. Create or update the file via GitHubService.createOrUpdateFile
   * 5. Record a Memory about the generated code
   * 6. Return { commitSha, filePath, generatedContent }
   */
  async generateCode(
    workspaceId: string,
    userId: string,
    input: GenerateCodeInput,
  ): Promise<{
    commitSha: string;
    filePath: string;
    generatedContent: string;
  }> {
    const correlationId = `coding-gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 1. Read the existing file (if any)
    const existing = await GitHubService.getFile(
      userId,
      input.owner,
      input.repo,
      input.filePath,
      input.branch,
    );

    const existingCode = existing?.content || '';
    const fileSha = existing?.sha;

    // 2. Build the prompt with issue context and existing code
    const systemPrompt = `You are a coding agent in the Lazynext Autonomous Company Operating System.
Your job is to generate or update code to fix a GitHub issue.

Output ONLY the new file content. Do not wrap it in markdown code fences.
Do not include explanations — just the raw file content.`;

    const userPrompt = `Issue context:
${input.issueContext}

File path: ${input.filePath}

${existingCode ? `Existing file content:\n\`\`\`\n${existingCode}\n\`\`\`` : 'This is a new file.'}

Please generate the complete updated file content that addresses the issue.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 3. Call atlasChat to generate the new code
    let generatedContent: string;
    try {
      generatedContent = await atlasChat(messages, undefined, 4000, 60000);
    } catch (e) {
      throw new Error(`Code generation failed: ${e instanceof Error ? e.message : 'unknown'}`);
    }

    // Strip markdown code fences if present
    generatedContent = generatedContent
      .replace(/^```[\w]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    // 4. Create or update the file
    const result = await GitHubService.createOrUpdateFile(userId, input.owner, input.repo, {
      path: input.filePath,
      message: `fix: update ${input.filePath} for issue`,
      content: generatedContent,
      branch: input.branch,
      sha: fileSha,
    });

    if (!result.ok || !result.commit) {
      throw new Error(`Failed to commit file: ${result.error || 'unknown'}`);
    }

    const commitSha = result.commit.sha;

    // 5. Record a Memory about the generated code
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      }),
    null);
    if (workspace) {
      await MemoryService.create({
        workspaceId,
        organizationId: workspace.organizationId,
        type: 'outcome',
        content: `Generated code for ${input.filePath} on branch ${input.branch}. Commit: ${commitSha}`,
        source: 'agent',
        sourceId: commitSha,
        confidence: 0.7,
        lifecycle: 'short',
        tags: ['coding-loop', 'code-generation', input.repo],
        createdBy: userId,
      }).catch(() => {});
    }

    return {
      commitSha,
      filePath: input.filePath,
      generatedContent,
    };
  },

  /**
   * Create a pull request for the coding loop.
   *
   * Steps:
   * 1. Call GitHubService.createPR
   * 2. Update the Task status to 'review'
   * 3. Record a Memory
   * 4. Emit an Event
   * 5. Return the PR object
   */
  async createPullRequest(
    workspaceId: string,
    userId: string,
    input: CreatePullRequestInput,
  ): Promise<GitHubPR> {
    const correlationId = `coding-pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 1. Create the PR
    const pr = await GitHubService.createPR(userId, input.owner, input.repo, {
      title: input.title,
      body: input.body,
      head: input.branch,
      base: input.base,
    });

    if (!pr) {
      throw new Error('Failed to create pull request');
    }

    // 2. Update the Task status to 'review' if taskId provided
    if (input.taskId) {
      await prisma.task.update({
        where: { id: input.taskId },
        data: {
          status: 'in_progress',
          outputs: JSON.stringify({
            prNumber: pr.number,
            prUrl: pr.html_url,
          }),
        },
      }).catch(() => {});
    }

    // 3. Record a Memory
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      }),
   null);
    if (workspace) {
      await MemoryService.create({
        workspaceId,
        organizationId: workspace.organizationId,
        type: 'decision',
        content: `Created PR #${pr.number}: ${input.title} for issue #${input.issueNumber}. Branch: ${input.branch} → ${input.base}`,
        source: 'agent',
        sourceId: String(pr.number),
        confidence: 0.8,
        lifecycle: 'medium',
        tags: ['coding-loop', 'pull-request', input.repo],
        createdBy: userId,
      }).catch(() => {});

      // 4. Emit an Event
      await EventService.emit({
        workspaceId,
        organizationId: workspace.organizationId,
        type: 'coding_loop.pr_created',
        actor: userId,
        actorType: 'user',
        resourceType: 'pull_request',
        resourceId: String(pr.number),
        metadata: {
          owner: input.owner,
          repo: input.repo,
          prNumber: pr.number,
          branch: input.branch,
          base: input.base,
          issueNumber: input.issueNumber,
        },
        correlationId,
      }).catch(() => {});
    }

    return pr;
  },

  /**
   * Verify and merge a pull request.
   *
   * Steps:
   * 1. Fetch PR details
   * 2. Check if PR is mergeable
   * 3. Call GitHubService.mergePR
   * 4. Update Task status to 'done' if taskId provided
   * 5. Record a Memory about the merge
   * 6. Emit an Event
   * 7. Return { merged, sha?, error? }
   */
  async verifyAndMerge(
    workspaceId: string,
    userId: string,
    input: VerifyAndMergeInput,
  ): Promise<{ merged: boolean; sha?: string; error?: string }> {
    const correlationId = `coding-merge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 1. Fetch PR details
    const pr = await GitHubService.getPR(userId, input.owner, input.repo, input.prNumber);
    if (!pr) {
      return { merged: false, error: 'Pull request not found' };
    }

    // 2. Check if PR is mergeable
    if (pr.merged) {
      return { merged: false, error: 'PR is already merged' };
    }
    if (pr.state === 'closed') {
      return { merged: false, error: 'PR is closed' };
    }
    if (pr.mergeable === false) {
      return { merged: false, error: 'PR has merge conflicts' };
    }

    // 3. Merge the PR
    const mergeResult = await GitHubService.mergePR(userId, input.owner, input.repo, input.prNumber, {
      commitTitle: `Merge PR #${input.prNumber}`,
      method: 'squash',
    });

    if (!mergeResult.ok) {
      return { merged: false, error: mergeResult.error || 'Merge failed' };
    }

    // 4. Update Task status to 'done' if taskId provided
    if (input.taskId) {
      await prisma.task.update({
        where: { id: input.taskId },
        data: { status: 'done' },
      }).catch(() => {});
    }

    // 5. Record a Memory about the merge
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      }),
   null);
    if (workspace) {
      await MemoryService.create({
        workspaceId,
        organizationId: workspace.organizationId,
        type: 'outcome',
        content: `Merged PR #${input.prNumber} in ${input.owner}/${input.repo}. SHA: ${mergeResult.sha}`,
        source: 'agent',
        sourceId: mergeResult.sha || String(input.prNumber),
        confidence: 0.9,
        lifecycle: 'long',
        tags: ['coding-loop', 'merge', input.repo],
        createdBy: userId,
      }).catch(() => {});

      // 6. Emit an Event
      await EventService.emit({
        workspaceId,
        organizationId: workspace.organizationId,
        type: 'coding_loop.merged',
        actor: userId,
        actorType: 'user',
        resourceType: 'pull_request',
        resourceId: String(input.prNumber),
        metadata: {
          owner: input.owner,
          repo: input.repo,
          prNumber: input.prNumber,
          sha: mergeResult.sha,
        },
        correlationId,
      }).catch(() => {});
    }

    return { merged: true, sha: mergeResult.sha };
  },

  /**
   * Get the status of a coding loop by task ID.
   *
   * Returns { task, agentRun, branchName, prNumber, status }
   */
  async getLoopStatus(workspaceId: string, taskId: string): Promise<CodingLoopStatus> {
    const task = await safePrisma(() =>
      prisma.task.findUnique({ where: { id: taskId } }),
    null);

    if (!task) {
      return { task: null, agentRun: null, branchName: null, prNumber: null, status: 'not_found' };
    }

    // Parse coding loop metadata from inputs
    const inputs = task.inputs ? JSON.parse(task.inputs) : {};
    const branchName = inputs.branchName || null;

    // Parse PR number from outputs
    const outputs = task.outputs ? JSON.parse(task.outputs) : {};
    const prNumber = outputs.prNumber || null;

    // Find the associated agent run
    const agentRun = await safePrisma(() =>
      prisma.agentRun.findFirst({
        where: { taskId: task.id },
        orderBy: { startedAt: 'desc' },
      }),
    null);

    return {
      task,
      agentRun,
      branchName,
      prNumber,
      status: task.status,
    };
  },

  /**
   * List recent coding loops (tasks with coding-related metadata).
   */
  async listLoops(workspaceId: string, take: number = 20): Promise<Array<Record<string, unknown>>> {
    // Find projects in this workspace
    const projects = await safePrisma(() =>
      prisma.project.findMany({
        where: { workspaceId, status: 'active' },
        select: { id: true },
      }),
    []);

    if (projects.length === 0) return [];

    const projectIds = projects.map((p) => p.id);

    // Find tasks with codingLoop metadata in inputs
    const tasks = await safePrisma(() =>
      prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          inputs: { contains: '"codingLoop":true' },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(take, 100),
      }),
   []);

    // Enrich with parsed metadata
    return tasks.map((task) => {
      const inputs = task.inputs ? JSON.parse(task.inputs) : {};
      const outputs = task.outputs ? JSON.parse(task.outputs) : {};
      return {
        ...task,
        branchName: inputs.branchName || null,
        owner: inputs.owner || null,
        repo: inputs.repo || null,
        issueNumber: inputs.issueNumber || null,
        issueTitle: inputs.issueTitle || null,
        prNumber: outputs.prNumber || null,
        prUrl: outputs.prUrl || null,
      };
    });
  },

  /**
   * Get or create a default project for coding loop tasks.
   */
  async getOrCreateCodingProject(workspaceId: string, userId: string): Promise<{ id: string }> {
    // Try to find an existing active project
    const existing = await safePrisma(() =>
      prisma.project.findFirst({
        where: { workspaceId, status: 'active' },
        select: { id: true },
      }),
    null);

    if (existing) return existing;

    // Create a default project for coding work
    const project = await prisma.project.create({
      data: {
        workspaceId,
        createdById: userId,
        name: 'Coding Loops',
        description: 'Default project for autonomous coding loop tasks',
        status: 'active',
      },
    });

    return { id: project.id };
  },
};
