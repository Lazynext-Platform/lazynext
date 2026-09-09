/**
 * Built-in Tool Executors
 *
 * These are the actual implementations of tools that agents can call.
 * Each executor is registered with the AgentRuntime's tool executor registry.
 *
 * Tools are grouped by category:
 * - Research: web_search, memory_search
 * - Data: company_query, data_analysis
 * - Creative: atlas_generate, atlas_chat
 * - Code: github_search, file_read, file_write
 * - GitHub: github_list_repos, github_list_issues, github_create_issue,
 *           github_list_prs, github_create_pr, github_merge_pr,
 *           github_get_file, github_create_file, github_create_branch
 * - Productivity: task_create, task_update, event_emit
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { atlasChat, submitGen, pollOnce } from '@/lib/atlas';
import { MemoryService } from '@/lib/services/memory';
import { EventService } from '@/lib/services/event';
import { GitHubService } from '@/lib/services/github';
import { SandboxService } from '@/lib/services/sandbox';
import { registerToolExecutor, type ToolExecutionContext } from '@/lib/services/agent-runtime';
import { INJECTION_GUARD } from '@/lib/creative/toolkit';
import { getSafePath, detectPathTraversal } from '../security/path-canonicalize';
import { registerCreativeTools } from './creative-bridge';

// ── Research Tools ──

registerToolExecutor('web_search', async (input: Record<string, unknown>) => {
  const query = String(input.query || '');
  if (!query) return { error: 'query_required' };

  // Use a simple web search via fetch
  // In production, this would use a real search API
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Lazynext/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { error: `search_failed: ${res.status}` };
    const html = await res.text();

    // Extract results (simplified)
    const results: Array<{ title: string; url: string; snippet: string }> = [];
    const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/g;
    let linkMatch: RegExpExecArray | null;
    let snippetMatch: RegExpExecArray | null;
    while ((linkMatch = linkRegex.exec(html)) && results.length < 5) {
      snippetMatch = snippetRegex.exec(html);
      results.push({
        title: linkMatch[2].replace(/<[^>]*>/g, '').trim(),
        url: linkMatch[1],
        snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : '',
      });
    }
    return { query, results, count: results.length };
  } catch (e) {
    return { error: `search_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('memory_search', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  const query = String(input.query || '');
  const type = input.type as string | undefined;
  if (!query) return { error: 'query_required' };

  const memories = await safePrisma(() =>
    prisma.memory.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        ...(type && { type }),
        content: { contains: query },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
  []);

  return { query, memories, count: memories.length };
});

// ── Data Tools ──

registerToolExecutor('company_query', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  const model = String(input.model || '');
  const operation = String(input.operation || 'findMany');
  const filter = input.filter as Record<string, unknown> | undefined;

  // Whitelist of allowed models for safety
  const allowedModels = [
    'goal', 'kpi', 'plan', 'task', 'approval', 'budget',
    'memory', 'event', 'organization', 'workspace',
    // Creative models (user-scoped — filtered by userId, not workspaceId)
    'creation', 'adCampaign', 'creativePerformance',
  ];
  if (!allowedModels.includes(model)) {
    return { error: `model_not_allowed: ${model}` };
  }

  // Only allow read operations
  if (!['findMany', 'findUnique', 'count'].includes(operation)) {
    return { error: `operation_not_allowed: ${operation}` };
  }

  // Creative models are user-scoped (userId only), not workspace-scoped
  const userScopedModels = ['creation', 'adCampaign', 'creativePerformance'];
  const isUserScoped = userScopedModels.includes(model);

  try {
    const modelDelegate = (prisma as unknown as Record<string, Record<string, (args: unknown) => Promise<unknown>>>)[model];
    if (!modelDelegate || !modelDelegate[operation]) {
      return { error: `model_or_operation_not_found: ${model}.${operation}` };
    }

    // Add security filter: workspaceId for OS models, userId for creative models
    const args = isUserScoped
      ? {
          where: {
            ...filter,
            userId: ctx.userId,
          },
          take: 20,
        }
      : {
          where: {
            ...filter,
            workspaceId: ctx.workspaceId,
          },
          take: 20,
        };

    const result = await modelDelegate[operation](args);
    return { model, operation, result };
  } catch (e) {
    return { error: `query_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('data_analysis', async (input: Record<string, unknown>) => {
  const data = input.data as unknown[];
  const operation = String(input.operation || 'summary');

  if (!Array.isArray(data)) {
    return { error: 'data_must_be_array' };
  }

  switch (operation) {
    case 'summary': {
      if (data.length === 0) return { count: 0, summary: 'empty' };
      const numbers = data.filter((d) => typeof d === 'number');
      if (numbers.length > 0) {
        return {
          count: data.length,
          numericCount: numbers.length,
          min: Math.min(...numbers),
          max: Math.max(...numbers),
          mean: numbers.reduce((a, b) => a + b, 0) / numbers.length,
          median: numbers.sort((a, b) => a - b)[Math.floor(numbers.length / 2)],
        };
      }
      return { count: data.length, summary: 'no_numeric_data' };
    }
    case 'count':
      return { count: data.length };
    case 'unique':
      return { unique: [...new Set(data)], count: new Set(data).size };
    case 'group':
      const groups: Record<string, unknown[]> = {};
      for (const item of data) {
        const key = String(item);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
      return { groups, groupCount: Object.keys(groups).length };
    default:
      return { error: `unknown_operation: ${operation}` };
  }
});

// ── Creative Tools ──

registerToolExecutor('atlas_generate', async (input: Record<string, unknown>) => {
  const prompt = String(input.prompt || '');
  const model = String(input.model || 'doubao-seed-2.1-turbo');
  if (!prompt) return { error: 'prompt_required' };

  try {
    const submitResult = await submitGen({
      endpoint: 'generateImage',
      model,
      prompt,
    });
    return { taskId: submitResult.id, status: 'submitted' };
  } catch (e) {
    return { error: `generation_failed: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('atlas_chat', async (input: Record<string, unknown>) => {
  const message = String(input.message || '');
  const systemPrompt = input.systemPrompt as string | undefined;
  if (!message) return { error: 'message_required' };

  try {
    const messages = systemPrompt
      ? [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: message },
        ]
      : [{ role: 'user' as const, content: message }];

    const response = await atlasChat(messages, undefined, 1000);
    return { response };
  } catch (e) {
    return { error: `chat_failed: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

// ── Creative Integration Tools (bridge creative workflows into the OS) ──

registerToolExecutor('creative_generate_brief', async (input: Record<string, unknown>) => {
  const product = String(input.product || '');
  const audience = String(input.audience || '');
  const goal = String(input.goal || '');
  if (!product) return { error: 'product_required' };

  try {
    const systemPrompt = `You are an expert creative strategist. Generate a comprehensive ad creative brief as valid JSON with fields: objective, targetAudience, keyMessage, tone, visualStyle, deliverables, platformRecommendations. ${INJECTION_GUARD}`;
    const userPrompt = `Product/Service: ${product}\nAudience: ${audience || 'general'}\nGoal: ${goal || 'brand awareness'}\n\nGenerate a creative brief.`;
    const response = await atlasChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      undefined,
      2000,
    );
    return { brief: response };
  } catch (e) {
    return { error: `creative_generate_brief_failed: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('creative_generate_hooks', async (input: Record<string, unknown>) => {
  const topic = String(input.topic || '');
  const platform = String(input.platform || 'tiktok');
  const count = Number(input.count || 5);
  if (!topic) return { error: 'topic_required' };

  try {
    const systemPrompt = `You are a viral ad hook expert. Generate ${count} attention-grabbing ad hooks for ${platform}. Return valid JSON: { "hooks": [{ "text": string, "type": string, "emotion": string }] }. ${INJECTION_GUARD}`;
    const userPrompt = `Topic: ${topic}\nPlatform: ${platform}\n\nGenerate ${count} hooks.`;
    const response = await atlasChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      undefined,
      1500,
    );
    return { hooks: response };
  } catch (e) {
    return { error: `creative_generate_hooks_failed: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('creative_generate_script', async (input: Record<string, unknown>) => {
  const hook = String(input.hook || '');
  const product = String(input.product || '');
  const duration = String(input.duration || '30s');
  if (!hook || !product) return { error: 'hook_and_product_required' };

  try {
    const systemPrompt = `You are a professional ad scriptwriter. Write a ${duration} ad script. Return valid JSON: { "title": string, "scenes": [{ "scene": number, "visual": string, "voiceover": string, "duration": string }], "cta": string }. ${INJECTION_GUARD}`;
    const userPrompt = `Hook: ${hook}\nProduct: ${product}\nDuration: ${duration}\n\nWrite the ad script.`;
    const response = await atlasChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      undefined,
      2000,
    );
    return { script: response };
  } catch (e) {
    return { error: `creative_generate_script_failed: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('creative_score', async (input: Record<string, unknown>) => {
  const combination = String(input.combination || '');
  if (!combination) return { error: 'combination_required' };

  try {
    const systemPrompt = `You are a creative performance predictor. Score the given creative combination on a 0-100 scale. Return valid JSON: { "overallScore": number, "hookStrength": number, "angleClarity": number, "ctaEffectiveness": number, "predictedCTR": number, "recommendations": string[] }. ${INJECTION_GUARD}`;
    const userPrompt = `Creative combination to score:\n${combination}\n\nProvide a score and analysis.`;
    const response = await atlasChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      undefined,
      1500,
    );
    return { score: response };
  } catch (e) {
    return { error: `creative_score_failed: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('creative_query_performance', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  if (!ctx.userId) return { error: 'userId_required' };
  const platform = input.platform as string | undefined;
  const take = Number(input.take || 50);

  try {
    const records = await safePrisma(() =>
      prisma.creativePerformance.findMany({
        where: {
          userId: ctx.userId,
          ...(platform && { platform }),
        },
        select: {
          id: true,
          creationId: true,
          platform: true,
          hookType: true,
          angleName: true,
          impressions: true,
          clicks: true,
          conversions: true,
          spend: true,
          revenue: true,
          roas: true,
          ctr: true,
          cvr: true,
          recordedAt: true,
        },
        orderBy: { recordedAt: 'desc' },
        take: Math.min(take, 200),
      }),
      [],
    );
    return { records, count: records.length };
  } catch (e) {
    return { error: `creative_query_performance_failed: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('creative_launch_campaign', async (input: Record<string, unknown>) => {
  const campaignId = String(input.campaignId || '');
  if (!campaignId) return { error: 'campaignId_required' };

  try {
    const campaign = await prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status: 'pending_approval' },
      select: { id: true, name: true, status: true, platform: true },
    });
    return { campaign, status: 'pending_approval' };
  } catch (e) {
    return { error: `creative_launch_campaign_failed: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('creative_analyze_reference', async (input: Record<string, unknown>) => {
  const referenceUrl = String(input.referenceUrl || '');
  const referenceText = String(input.referenceText || '');
  if (!referenceUrl && !referenceText) return { error: 'referenceUrl_or_referenceText_required' };

  try {
    const systemPrompt = `You are a creative analyst. Analyze the provided reference ad/video and extract key creative elements. Return valid JSON: { "hooks": string[], "angles": string[], "cta": string, "visualStyle": string, "emotionalTriggers": string[], "pacing": string, "strengths": string[], "improvements": string[] }. ${INJECTION_GUARD}`;
    const userPrompt = `Reference URL: ${referenceUrl || 'N/A'}\nReference text/transcript: ${referenceText || 'N/A'}\n\nAnalyze this reference creative.`;
    const response = await atlasChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      undefined,
      2000,
    );
    return { analysis: response };
  } catch (e) {
    return { error: `creative_analyze_reference_failed: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

// ── Code Tools ──

registerToolExecutor('github_search', async (input: Record<string, unknown>) => {
  const query = String(input.query || '');
  const repo = input.repo as string | undefined;
  if (!query) return { error: 'query_required' };

  try {
    const q = repo ? `${query} repo:${repo}` : query;
    const res = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(q)}&per_page=5`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Lazynext/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { error: `github_search_failed: ${res.status}` };
    const data = await res.json() as { items?: Array<{ name: string; path: string; html_url: string; repository: { full_name: string } }> };
    return {
      query,
      results: (data.items || []).map((item) => ({
        name: item.name,
        path: item.path,
        url: item.html_url,
        repo: item.repository?.full_name,
      })),
      count: data.items?.length || 0,
    };
  } catch (e) {
    return { error: `github_search_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('file_read', async (input: Record<string, unknown>) => {
  const path = String(input.path || '');
  if (!path) return { error: 'path_required' };

  // Security: canonicalize and validate the path to prevent traversal.
  // Reads are allowed from workspace-safe base directories only.
  const allowedPrefixes = ['docs/', 'src/', 'test/', 'prisma/', '.dev-media/'];
  const isAllowed = allowedPrefixes.some((p) => path.startsWith(p));
  if (!isAllowed && !path.startsWith('/tmp/')) {
    return { error: 'path_not_allowed' };
  }

  // Determine the base for canonicalization
  const basePath = path.startsWith('/tmp/') ? '/tmp' : process.cwd();

  // Reject obvious traversal patterns early
  if (detectPathTraversal(path)) {
    try {
      getSafePath(path, basePath);
    } catch {
      return { error: 'path_traversal_detected' };
    }
  }

  let safePath: string;
  try {
    safePath = getSafePath(path, basePath);
  } catch {
    return { error: 'path_traversal_detected' };
  }

  try {
    const fs = await import('node:fs/promises');
    const content = await fs.readFile(safePath, 'utf-8');
    return { path: safePath, content: content.slice(0, 10000), size: content.length };
  } catch (e) {
    return { error: `file_read_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('file_write', async (input: Record<string, unknown>) => {
  const path = String(input.path || '');
  const content = String(input.content || '');
  if (!path || !content) return { error: 'path_and_content_required' };

  // Security: only allow writing to /tmp/ or .dev-media/
  if (!path.startsWith('/tmp/') && !path.startsWith('.dev-media/')) {
    return { error: 'path_not_allowed' };
  }

  // Canonicalize and validate the path to prevent traversal
  const basePath = path.startsWith('/tmp/') ? '/tmp' : process.cwd();

  // Reject obvious traversal patterns early
  if (detectPathTraversal(path)) {
    try {
      getSafePath(path, basePath);
    } catch {
      return { error: 'path_traversal_detected' };
    }
  }

  let safePath: string;
  try {
    safePath = getSafePath(path, basePath);
  } catch {
    return { error: 'path_traversal_detected' };
  }

  try {
    const fs = await import('node:fs/promises');
    await fs.writeFile(safePath, content, 'utf-8');
    return { path: safePath, bytesWritten: content.length };
  } catch (e) {
    return { error: `file_write_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

// ── GitHub Tools ──

registerToolExecutor('github_list_repos', async (_input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  if (!ctx.userId) return { error: 'userId_required' };
  try {
    const { connected, username } = await GitHubService.isConnected(ctx.userId);
    if (!connected) return { error: 'github_not_connected' };
    const page = Number(_input.page || 1);
    const perPage = Number(_input.perPage || 30);
    const repos = await GitHubService.listRepos(ctx.userId, page, perPage);
    return { username, repos, count: repos.length };
  } catch (e) {
    return { error: `github_list_repos_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('github_list_issues', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  if (!ctx.userId) return { error: 'userId_required' };
  const owner = String(input.owner || '');
  const repo = String(input.repo || '');
  if (!owner || !repo) return { error: 'owner_and_repo_required' };
  const state = (input.state as 'open' | 'closed' | 'all') || 'open';
  try {
    const { connected } = await GitHubService.isConnected(ctx.userId);
    if (!connected) return { error: 'github_not_connected' };
    const issues = await GitHubService.listIssues(ctx.userId, owner, repo, state);
    return { owner, repo, state, issues, count: issues.length };
  } catch (e) {
    return { error: `github_list_issues_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('github_create_issue', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  if (!ctx.userId) return { error: 'userId_required' };
  const owner = String(input.owner || '');
  const repo = String(input.repo || '');
  const title = String(input.title || '');
  if (!owner || !repo || !title) return { error: 'owner_repo_and_title_required' };
  const body = input.body as string | undefined;
  const labels = input.labels as string[] | undefined;
  const assignees = input.assignees as string[] | undefined;
  try {
    const { connected } = await GitHubService.isConnected(ctx.userId);
    if (!connected) return { error: 'github_not_connected' };
    const issue = await GitHubService.createIssue(ctx.userId, owner, repo, {
      title,
      body,
      labels,
      assignees,
    });
    if (!issue) return { error: 'github_create_issue_failed' };
    return { issue, number: issue.number, url: issue.html_url };
  } catch (e) {
    return { error: `github_create_issue_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('github_list_prs', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  if (!ctx.userId) return { error: 'userId_required' };
  const owner = String(input.owner || '');
  const repo = String(input.repo || '');
  if (!owner || !repo) return { error: 'owner_and_repo_required' };
  const state = (input.state as 'open' | 'closed' | 'all') || 'open';
  try {
    const { connected } = await GitHubService.isConnected(ctx.userId);
    if (!connected) return { error: 'github_not_connected' };
    const prs = await GitHubService.listPRs(ctx.userId, owner, repo, state);
    return { owner, repo, state, prs, count: prs.length };
  } catch (e) {
    return { error: `github_list_prs_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('github_create_pr', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  if (!ctx.userId) return { error: 'userId_required' };
  const owner = String(input.owner || '');
  const repo = String(input.repo || '');
  const title = String(input.title || '');
  const head = String(input.head || '');
  const base = String(input.base || '');
  if (!owner || !repo || !title || !head || !base) return { error: 'owner_repo_title_head_and_base_required' };
  const body = input.body as string | undefined;
  const draft = input.draft as boolean | undefined;
  try {
    const { connected } = await GitHubService.isConnected(ctx.userId);
    if (!connected) return { error: 'github_not_connected' };
    const pr = await GitHubService.createPR(ctx.userId, owner, repo, {
      title,
      body,
      head,
      base,
      draft,
    });
    if (!pr) return { error: 'github_create_pr_failed' };
    return { pr, number: pr.number, url: pr.html_url };
  } catch (e) {
    return { error: `github_create_pr_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('github_merge_pr', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  if (!ctx.userId) return { error: 'userId_required' };
  const owner = String(input.owner || '');
  const repo = String(input.repo || '');
  const prNumber = Number(input.prNumber || 0);
  if (!owner || !repo || !prNumber) return { error: 'owner_repo_and_prNumber_required' };
  const commitTitle = input.commitTitle as string | undefined;
  const method = input.method as 'merge' | 'squash' | 'rebase' | undefined;
  try {
    const { connected } = await GitHubService.isConnected(ctx.userId);
    if (!connected) return { error: 'github_not_connected' };
    const result = await GitHubService.mergePR(ctx.userId, owner, repo, prNumber, {
      commitTitle,
      method,
    });
    return { owner, repo, prNumber, ...result };
  } catch (e) {
    return { error: `github_merge_pr_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('github_get_file', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  if (!ctx.userId) return { error: 'userId_required' };
  const owner = String(input.owner || '');
  const repo = String(input.repo || '');
  const path = String(input.path || '');
  if (!owner || !repo || !path) return { error: 'owner_repo_and_path_required' };
  const ref = input.ref as string | undefined;
  try {
    const { connected } = await GitHubService.isConnected(ctx.userId);
    if (!connected) return { error: 'github_not_connected' };
    const file = await GitHubService.getFile(ctx.userId, owner, repo, path, ref);
    if (!file) return { error: 'github_get_file_failed' };
    return { owner, repo, path, ref, content: file.content, sha: file.sha };
  } catch (e) {
    return { error: `github_get_file_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('github_create_file', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  if (!ctx.userId) return { error: 'userId_required' };
  const owner = String(input.owner || '');
  const repo = String(input.repo || '');
  const path = String(input.path || '');
  const message = String(input.message || '');
  const content = String(input.content || '');
  const branch = String(input.branch || '');
  if (!owner || !repo || !path || !message || !content || !branch) {
    return { error: 'owner_repo_path_message_content_and_branch_required' };
  }
  const sha = input.sha as string | undefined;
  try {
    const { connected } = await GitHubService.isConnected(ctx.userId);
    if (!connected) return { error: 'github_not_connected' };
    const result = await GitHubService.createOrUpdateFile(ctx.userId, owner, repo, {
      path,
      message,
      content,
      branch,
      sha,
    });
    return { owner, repo, path, branch, ...result };
  } catch (e) {
    return { error: `github_create_file_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('github_create_branch', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  if (!ctx.userId) return { error: 'userId_required' };
  const owner = String(input.owner || '');
  const repo = String(input.repo || '');
  const branchName = String(input.branchName || '');
  if (!owner || !repo || !branchName) return { error: 'owner_repo_and_branchName_required' };
  const fromBranch = input.fromBranch as string | undefined;
  try {
    const { connected } = await GitHubService.isConnected(ctx.userId);
    if (!connected) return { error: 'github_not_connected' };
    const result = await GitHubService.createBranch(ctx.userId, owner, repo, branchName, fromBranch);
    return { owner, repo, branchName, ...result };
  } catch (e) {
    return { error: `github_create_branch_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

// ── Productivity Tools ──

registerToolExecutor('task_create', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  const title = String(input.title || '');
  const description = input.description as string | undefined;
  const priority = String(input.priority || 'medium');
  if (!title) return { error: 'title_required' };

  // Find or create default project
  const project = await safePrisma(() =>
    prisma.project.findFirst({
      where: { workspaceId: ctx.workspaceId, status: 'active' },
      select: { id: true },
    }),
  null);

  if (!project) {
    return { error: 'no_project_found' };
  }

  try {
    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        title: title.slice(0, 300),
        description: (description || '').slice(0, 5000),
        priority,
        status: 'todo',
      },
    });
    return { taskId: task.id, title: task.title };
  } catch (e) {
    return { error: `task_create_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('task_update', async (input: Record<string, unknown>) => {
  const taskId = String(input.taskId || '');
  const status = String(input.status || '');
  if (!taskId || !status) return { error: 'taskId_and_status_required' };

  const allowedStatuses = ['todo', 'in_progress', 'done', 'cancelled', 'blocked'];
  if (!allowedStatuses.includes(status)) {
    return { error: `invalid_status: ${status}` };
  }

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { status },
    });
    return { taskId, status: 'updated' };
  } catch (e) {
    return { error: `task_update_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

registerToolExecutor('event_emit', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  const type = String(input.type || '');
  const metadata = input.metadata as Record<string, unknown> | undefined;
  if (!type) return { error: 'type_required' };

  try {
    const event = await EventService.emit({
      workspaceId: ctx.workspaceId,
      organizationId: ctx.organizationId,
      type,
      metadata: metadata || {},
      actorType: 'agent',
      actor: ctx.agentRunId,
    });
    return { eventId: event.id };
  } catch (e) {
    return { error: `event_emit_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

// ── Sandbox Tools ──

registerToolExecutor('sandbox_execute', async (input: Record<string, unknown>, ctx: ToolExecutionContext) => {
  const language = String(input.language || '');
  const code = String(input.code || '');
  if (!language) return { error: 'language_required' };
  if (!code) return { error: 'code_required' };

  const validLanguages = ['javascript', 'typescript', 'python', 'shell'];
  if (!validLanguages.includes(language)) {
    return { error: `invalid_language: ${language}` };
  }

  const timeoutSec = input.timeoutSec as number | undefined;
  const taskId = (ctx as unknown as Record<string, unknown>).taskId as string | undefined;

  try {
    const run = await SandboxService.run(ctx.workspaceId, {
      language: language as 'javascript' | 'typescript' | 'python' | 'shell',
      code,
      timeoutSec,
      agentRunId: ctx.agentRunId,
      taskId,
    });
    return {
      runId: run.id,
      status: run.status,
      stdout: run.stdout,
      stderr: run.stderr,
      exitCode: run.exitCode,
      durationMs: run.durationMs,
    };
  } catch (e) {
    return { error: `sandbox_execute_error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
});

// ── Tool Definitions (for seeding) ──

export interface ToolDefSeed {
  name: string;
  description: string;
  category: string;
  riskCategory: string;
  budgetCategory: string;
  timeoutSec: number;
  inputSchema: Record<string, unknown>;
  allowedRoles: string[];
}

export const BUILT_IN_TOOLS: ToolDefSeed[] = [
  {
    name: 'web_search',
    description: 'Search the web for information. Returns titles, URLs, and snippets.',
    category: 'research',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 15,
    inputSchema: { query: 'string (required)' },
    allowedRoles: ['*'],
  },
  {
    name: 'memory_search',
    description: 'Search company memory for past decisions, outcomes, and context.',
    category: 'research',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 5,
    inputSchema: { query: 'string (required)', type: 'string (optional)' },
    allowedRoles: ['*'],
  },
  {
    name: 'company_query',
    description: 'Query company data (goals, plans, tasks, budgets, etc.). Read-only.',
    category: 'data',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 5,
    inputSchema: { model: 'string (required)', operation: 'findMany|findUnique|count', filter: 'object (optional)' },
    allowedRoles: ['*'],
  },
  {
    name: 'data_analysis',
    description: 'Analyze an array of data (summary, count, unique, group).',
    category: 'data',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 5,
    inputSchema: { data: 'array (required)', operation: 'summary|count|unique|group' },
    allowedRoles: ['*'],
  },
  {
    name: 'atlas_generate',
    description: 'Submit a generation task to the Atlas Cloud AI API.',
    category: 'creative',
    riskCategory: 'medium',
    budgetCategory: 'credits',
    timeoutSec: 30,
    inputSchema: { prompt: 'string (required)', model: 'string (optional)' },
    allowedRoles: ['*'],
  },
  {
    name: 'atlas_chat',
    description: 'Call the Atlas LLM chat API for reasoning or text generation.',
    category: 'creative',
    riskCategory: 'low',
    budgetCategory: 'credits',
    timeoutSec: 45,
    inputSchema: { message: 'string (required)', systemPrompt: 'string (optional)' },
    allowedRoles: ['*'],
  },
  {
    name: 'creative_generate_brief',
    description: 'Generate a comprehensive ad creative brief using AI (objective, audience, message, tone, visuals).',
    category: 'creative',
    riskCategory: 'low',
    budgetCategory: 'credits',
    timeoutSec: 45,
    inputSchema: { product: 'string (required)', audience: 'string (optional)', goal: 'string (optional)' },
    allowedRoles: ['growth', 'design', '*'],
  },
  {
    name: 'creative_generate_hooks',
    description: 'Generate attention-grabbing ad hooks for a given topic and platform.',
    category: 'creative',
    riskCategory: 'low',
    budgetCategory: 'credits',
    timeoutSec: 30,
    inputSchema: { topic: 'string (required)', platform: 'string (optional, default tiktok)', count: 'number (optional, default 5)' },
    allowedRoles: ['growth', 'design', '*'],
  },
  {
    name: 'creative_generate_script',
    description: 'Generate a structured ad script (scenes, voiceover, CTA) from a hook and product.',
    category: 'creative',
    riskCategory: 'low',
    budgetCategory: 'credits',
    timeoutSec: 45,
    inputSchema: { hook: 'string (required)', product: 'string (required)', duration: 'string (optional, default 30s)' },
    allowedRoles: ['growth', 'design', '*'],
  },
  {
    name: 'creative_score',
    description: 'Score a creative combination (hook + angle + CTA) on a 0-100 scale with predicted CTR.',
    category: 'creative',
    riskCategory: 'low',
    budgetCategory: 'credits',
    timeoutSec: 30,
    inputSchema: { combination: 'string (required)' },
    allowedRoles: ['growth', 'design', '*'],
  },
  {
    name: 'creative_query_performance',
    description: 'Query creative performance records (impressions, clicks, conversions, ROAS) for the user.',
    category: 'creative',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 10,
    inputSchema: { platform: 'string (optional)', take: 'number (optional, default 50, max 200)' },
    allowedRoles: ['growth', 'design', '*'],
  },
  {
    name: 'creative_launch_campaign',
    description: 'Mark an ad campaign as ready to launch (sets status to pending_approval). Mutating — requires approval.',
    category: 'creative',
    riskCategory: 'high',
    budgetCategory: 'free',
    timeoutSec: 10,
    inputSchema: { campaignId: 'string (required)' },
    allowedRoles: ['growth', 'design', '*'],
  },
  {
    name: 'creative_analyze_reference',
    description: 'Analyze a reference video/ad to extract hooks, angles, CTA, visual style, and emotional triggers.',
    category: 'creative',
    riskCategory: 'low',
    budgetCategory: 'credits',
    timeoutSec: 45,
    inputSchema: { referenceUrl: 'string (optional)', referenceText: 'string (optional)' },
    allowedRoles: ['growth', 'design', '*'],
  },
  {
    name: 'github_search',
    description: 'Search GitHub code, issues, or repositories.',
    category: 'code',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 15,
    inputSchema: { query: 'string (required)', repo: 'string (optional, e.g. owner/repo)' },
    allowedRoles: ['*'],
  },
  {
    name: 'file_read',
    description: 'Read a file from the workspace (docs/, src/, test/, prisma/).',
    category: 'code',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 5,
    inputSchema: { path: 'string (required)' },
    allowedRoles: ['*'],
  },
  {
    name: 'file_write',
    description: 'Write a file to /tmp/ or .dev-media/. Restricted paths only.',
    category: 'code',
    riskCategory: 'medium',
    budgetCategory: 'free',
    timeoutSec: 5,
    inputSchema: { path: 'string (required)', content: 'string (required)' },
    allowedRoles: ['*'],
  },
  {
    name: 'github_list_repos',
    description: 'List GitHub repositories for the connected user. Read-only.',
    category: 'github',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 15,
    inputSchema: { page: 'number (optional, default 1)', perPage: 'number (optional, default 30)' },
    allowedRoles: ['*'],
  },
  {
    name: 'github_list_issues',
    description: 'List issues in a GitHub repository. Read-only.',
    category: 'github',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 15,
    inputSchema: { owner: 'string (required)', repo: 'string (required)', state: 'open|closed|all (optional, default open)' },
    allowedRoles: ['*'],
  },
  {
    name: 'github_create_issue',
    description: 'Create an issue in a GitHub repository. Mutating — requires approval.',
    category: 'github',
    riskCategory: 'high',
    budgetCategory: 'free',
    timeoutSec: 15,
    inputSchema: { owner: 'string (required)', repo: 'string (required)', title: 'string (required)', body: 'string (optional)', labels: 'string[] (optional)', assignees: 'string[] (optional)' },
    allowedRoles: ['*'],
  },
  {
    name: 'github_list_prs',
    description: 'List pull requests in a GitHub repository. Read-only.',
    category: 'github',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 15,
    inputSchema: { owner: 'string (required)', repo: 'string (required)', state: 'open|closed|all (optional, default open)' },
    allowedRoles: ['*'],
  },
  {
    name: 'github_create_pr',
    description: 'Create a pull request in a GitHub repository. Mutating — requires approval.',
    category: 'github',
    riskCategory: 'high',
    budgetCategory: 'free',
    timeoutSec: 15,
    inputSchema: { owner: 'string (required)', repo: 'string (required)', title: 'string (required)', body: 'string (optional)', head: 'string (required)', base: 'string (required)', draft: 'boolean (optional)' },
    allowedRoles: ['*'],
  },
  {
    name: 'github_merge_pr',
    description: 'Merge a pull request in a GitHub repository. Mutating — requires approval.',
    category: 'github',
    riskCategory: 'high',
    budgetCategory: 'free',
    timeoutSec: 20,
    inputSchema: { owner: 'string (required)', repo: 'string (required)', prNumber: 'number (required)', commitTitle: 'string (optional)', method: 'merge|squash|rebase (optional, default squash)' },
    allowedRoles: ['*'],
  },
  {
    name: 'github_get_file',
    description: 'Get file contents from a GitHub repository. Read-only.',
    category: 'github',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 15,
    inputSchema: { owner: 'string (required)', repo: 'string (required)', path: 'string (required)', ref: 'string (optional, branch or commit sha)' },
    allowedRoles: ['*'],
  },
  {
    name: 'github_create_file',
    description: 'Create or update a file in a GitHub repository. Mutating — requires approval.',
    category: 'github',
    riskCategory: 'high',
    budgetCategory: 'free',
    timeoutSec: 15,
    inputSchema: { owner: 'string (required)', repo: 'string (required)', path: 'string (required)', message: 'string (required)', content: 'string (required)', branch: 'string (required)', sha: 'string (optional, required for updates)' },
    allowedRoles: ['*'],
  },
  {
    name: 'github_create_branch',
    description: 'Create a branch in a GitHub repository. Mutating — requires approval.',
    category: 'github',
    riskCategory: 'high',
    budgetCategory: 'free',
    timeoutSec: 15,
    inputSchema: { owner: 'string (required)', repo: 'string (required)', branchName: 'string (required)', fromBranch: 'string (optional, default main)' },
    allowedRoles: ['*'],
  },
  {
    name: 'task_create',
    description: 'Create a new task in the default project.',
    category: 'productivity',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 5,
    inputSchema: { title: 'string (required)', description: 'string (optional)', priority: 'low|medium|high|urgent' },
    allowedRoles: ['*'],
  },
  {
    name: 'task_update',
    description: 'Update a task status.',
    category: 'productivity',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 5,
    inputSchema: { taskId: 'string (required)', status: 'todo|in_progress|done|cancelled|blocked' },
    allowedRoles: ['*'],
  },
  {
    name: 'event_emit',
    description: 'Emit an event to the audit log.',
    category: 'productivity',
    riskCategory: 'low',
    budgetCategory: 'free',
    timeoutSec: 5,
    inputSchema: { type: 'string (required)', metadata: 'object (optional)' },
    allowedRoles: ['*'],
  },
  {
    name: 'sandbox_execute',
    description: 'Execute code in an isolated sandbox environment with resource limits.',
    category: 'sandbox',
    riskCategory: 'high',
    budgetCategory: 'free',
    timeoutSec: 60,
    inputSchema: { language: 'string (required: javascript|typescript|python|shell)', code: 'string (required)', timeoutSec: 'number (optional, default 30, max 60)' },
    allowedRoles: ['*'],
  },
];

/**
 * Seed built-in tool definitions into the database.
 * Call this on startup or via a seed script.
 */
export async function seedBuiltInTools(workspaceId: string): Promise<number> {
  let count = 0;
  for (const tool of BUILT_IN_TOOLS) {
    // Check if tool already exists
    const existing = await safePrisma(() =>
      prisma.toolDef.findFirst({
        where: { workspaceId, name: tool.name },
      }),
    null);

    if (existing) continue;

    await prisma.toolDef.create({
      data: {
        workspaceId,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        riskCategory: tool.riskCategory,
        budgetCategory: tool.budgetCategory,
        timeoutSec: tool.timeoutSec,
        inputSchema: JSON.stringify(tool.inputSchema),
        allowedRoles: JSON.stringify(tool.allowedRoles),
        enabled: true,
        version: '1.0.0',
      },
    }).catch(() => {});
    count++;
  }
  return count;
}

// Register creative tools as OS tools for growth/design agents
registerCreativeTools();
