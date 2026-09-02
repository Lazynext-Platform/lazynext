/**
 * Asset persistence helpers for the Creative Director.
 *
 * Persists generated creative outputs (briefs, hooks, angles, scripts,
 * storyboards, scores, variants) as Asset records in D1 so they can be
 * browsed, reused, and referenced later.
 */

import { prisma } from '@/lib/prisma';

export type AssetType = 'brief' | 'hooks' | 'angles' | 'script' | 'storyboard' | 'score' | 'variants' | 'creative_package';

/**
 * A stage result as seen by the pipeline asset persistence logic.
 */
export interface PipelineStageResultLike {
  stage: string;
  status: string;
  output?: Record<string, unknown> | null;
}

/**
 * A pipeline state as seen by the pipeline asset persistence logic.
 */
export interface PipelineStateLike {
  pipelineId: string;
  config: { name?: string };
  totalCreditsUsed: number;
  stageResults: PipelineStageResultLike[];
}

/**
 * A derived child asset specification — what to persist for a given stage.
 */
export interface DerivedAssetSpec {
  type: AssetType;
  name: string;
  data: Record<string, unknown>;
  tags: string[];
}

/**
 * Derive the child asset specifications from a pipeline state.
 * This is a pure function that can be tested without a database.
 * It mirrors the logic in `persistPipelineAssets` in the pipeline route.
 */
export function derivePipelineChildAssets(
  state: PipelineStateLike,
): DerivedAssetSpec[] {
  const pipelineName = state.config.name || `Pipeline ${state.pipelineId.slice(0, 8)}`;
  const specs: DerivedAssetSpec[] = [];

  for (const result of state.stageResults) {
    if (!result.output) continue;
    const output = result.output;

    if (result.stage === 'brief' && output.brief) {
      specs.push({
        type: 'brief',
        name: `${pipelineName} — Brief`,
        data: { brief: output.brief, pipelineId: state.pipelineId },
        tags: ['pipeline', 'brief'],
      });
    }

    if (result.stage === 'script' && (output.script || output.hooks || output.angles)) {
      specs.push({
        type: 'script',
        name: `${pipelineName} — Script`,
        data: { script: output.script, hooks: output.hooks, angles: output.angles, pipelineId: state.pipelineId },
        tags: ['pipeline', 'script'],
      });
    }

    if (result.stage === 'storyboard' && output.storyboard) {
      specs.push({
        type: 'storyboard',
        name: `${pipelineName} — Storyboard`,
        data: { storyboard: output.storyboard, pipelineId: state.pipelineId },
        tags: ['pipeline', 'storyboard'],
      });
    }

    if (result.stage === 'media_generation' && output.mediaUrls) {
      specs.push({
        type: 'storyboard',
        name: `${pipelineName} — Media`,
        data: {
          mediaUrls: output.mediaUrls,
          shotCount: (output.mediaUrls as string[]).length,
          pipelineId: state.pipelineId,
        },
        tags: ['pipeline', 'media'],
      });
    }

    if (result.stage === 'audio' && output.audioUrl) {
      specs.push({
        type: 'script',
        name: `${pipelineName} — Audio`,
        data: { audioUrl: output.audioUrl, pipelineId: state.pipelineId },
        tags: ['pipeline', 'audio'],
      });
    }

    if (result.stage === 'edit' && output.editResult) {
      specs.push({
        type: 'script',
        name: `${pipelineName} — Edit Decision List`,
        data: { editResult: output.editResult, pipelineId: state.pipelineId },
        tags: ['pipeline', 'edit', 'edl'],
      });
    }

    if (result.stage === 'compliance' && output.complianceResult) {
      specs.push({
        type: 'score',
        name: `${pipelineName} — Compliance`,
        data: { complianceResult: output.complianceResult, pipelineId: state.pipelineId },
        tags: ['pipeline', 'compliance'],
      });
    }

    if (result.stage === 'publish' && output.publishResult) {
      specs.push({
        type: 'variants',
        name: `${pipelineName} — Publish Result`,
        data: { publishResult: output.publishResult, pipelineId: state.pipelineId },
        tags: ['pipeline', 'publish'],
      });
    }

    if (result.stage === 'score' && output.score != null) {
      specs.push({
        type: 'score',
        name: `${pipelineName} — Score`,
        data: { score: output.score, pipelineId: state.pipelineId },
        tags: ['pipeline', 'score'],
      });
    }
  }

  return specs;
}

/**
 * Persist a creative output as an Asset with an initial AssetVersion.
 * Non-fatal: if the DB is unavailable, returns null and the director continues.
 */
export async function persistAsset(
  userId: string,
  type: AssetType,
  name: string,
  data: Record<string, unknown>,
  parentId?: string,
  tags?: string[],
): Promise<string | null> {
  try {
    const asset = await prisma.asset.create({
      data: {
        userId,
        type,
        name,
        parentId: parentId || null,
        tags: tags ? JSON.stringify(tags) : undefined,
        metadata: JSON.stringify(data),
        versions: {
          create: {
            version: 1,
            url: `asset://${type}/${Date.now()}`,
            metadata: JSON.stringify({ generatedAt: new Date().toISOString() }),
          },
        },
      },
    });
    return asset.id;
  } catch {
    // Table may not exist or DB unavailable — non-fatal
    return null;
  }
}

/**
 * Persist the complete creative package from a Creative Director run.
 * Creates a parent "creative_package" asset and individual child assets
 * for each component (brief, hooks, angles, best combination, variants).
 */
export async function persistCreativePackage(
  userId: string,
  packageData: {
    brief?: Record<string, unknown>;
    hooks?: Record<string, unknown>;
    angles?: Record<string, unknown>;
    bestCombination?: Record<string, unknown>;
    variants?: Record<string, unknown>;
    totalCreditsSpent: number;
    budgetCredits: number;
  },
): Promise<{ packageId: string | null; childIds: string[] }> {
  const childIds: string[] = [];

  // Create the parent package asset
  const packageId = await persistAsset(
    userId,
    'creative_package',
    `Creative Package ${new Date().toISOString().slice(0, 16)}`,
    {
      totalCreditsSpent: packageData.totalCreditsSpent,
      budgetCredits: packageData.budgetCredits,
      createdAt: new Date().toISOString(),
    },
  );

  // Persist individual components as children
  if (packageData.brief) {
    const id = await persistAsset(userId, 'brief', 'Brief', packageData.brief, packageId || undefined, ['director']);
    if (id) childIds.push(id);
  }
  if (packageData.hooks) {
    const id = await persistAsset(userId, 'hooks', 'Hooks', packageData.hooks, packageId || undefined, ['director']);
    if (id) childIds.push(id);
  }
  if (packageData.angles) {
    const id = await persistAsset(userId, 'angles', 'Angles', packageData.angles, packageId || undefined, ['director']);
    if (id) childIds.push(id);
  }
  if (packageData.bestCombination) {
    const id = await persistAsset(userId, 'script', 'Best Combination', packageData.bestCombination, packageId || undefined, ['director', 'best']);
    if (id) childIds.push(id);
  }
  if (packageData.variants) {
    const id = await persistAsset(userId, 'variants', 'A/B Variants', packageData.variants, packageId || undefined, ['director']);
    if (id) childIds.push(id);
  }

  return { packageId, childIds };
}

/**
 * List assets for a user, optionally filtered by type.
 */
export async function listAssets(userId: string, type?: AssetType): Promise<Array<{
  id: string;
  type: string;
  name: string;
  parentId: string | null;
  tags: unknown;
  metadata: unknown;
  createdAt: Date;
}>> {
  try {
    return await prisma.asset.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        name: true,
        parentId: true,
        tags: true,
        metadata: true,
        createdAt: true,
      },
    });
  } catch {
    return [];
  }
}

/**
 * Delete an asset and its child assets (cascade).
 * Verifies ownership before deleting.
 * Returns the number of deleted assets.
 */
export async function deleteAsset(userId: string, assetId: string): Promise<number> {
  // Verify ownership
  const asset = await prisma.asset.findFirst({ where: { id: assetId, userId } });
  if (!asset) return 0;

  // Delete children first (if this is a package)
  const children = await prisma.asset.findMany({ where: { parentId: assetId }, select: { id: true } });
  let deleted = 0;
  for (const child of children) {
    deleted += await deleteAsset(userId, child.id);
  }

  // Delete the asset itself
  await prisma.asset.delete({ where: { id: assetId } });
  deleted += 1;
  return deleted;
}
