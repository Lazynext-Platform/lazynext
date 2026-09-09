import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

export interface DepreciationResult {
  assetId: string;
  name: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
  depreciationRate: number;
  yearsElapsed: number;
}

export interface DepreciationSummary {
  totalAssets: number;
  totalCost: number;
  totalAccumulatedDepreciation: number;
  totalBookValue: number;
}

export interface DisposalInput {
  itAssetId: string;
  disposalDate: Date;
  disposalMethod: 'sold' | 'donated' | 'recycled' | 'scrapped';
  disposalValue: number;
  reason: string;
}

export interface AssetTag {
  assetId: string;
  name: string;
  tag: string;
  assetTag: string;
  serialNumber: string;
}

interface ITAssetRow {
  id: string;
  name: string;
  assetTag: string;
  serialNumber: string;
  purchaseCost: number | null;
  purchaseDate: Date | null;
  metadata: string;
  status: string;
}

interface AssetMeta {
  salvageValue?: number;
  usefulLifeYears?: number;
}

function parseMeta(raw: string): AssetMeta {
  try {
    const obj = JSON.parse(raw);
    return typeof obj === 'object' && obj ? obj : {};
  } catch {
    return {};
  }
}

export const AssetDepreciationService = {
  async calculateDepreciation(itAssetId: string): Promise<DepreciationResult | null> {
    const asset = await safePrisma(() =>
      prisma.iTAsset.findUnique({ where: { id: itAssetId } }),
    null);
    if (!asset) return null;
    return computeDepreciation(asset as ITAssetRow);
  },

  async getDepreciationReport(organizationId: string): Promise<DepreciationResult[]> {
    const assets = await safePrisma(() =>
      prisma.iTAsset.findMany({
        where: { organizationId, status: { not: 'retired' } },
        orderBy: { name: 'asc' },
        take: 500,
      }),
    []);
    return (assets as ITAssetRow[])
      .map((a) => computeDepreciation(a))
      .filter((d): d is DepreciationResult => d !== null);
  },

  async getDepreciationSummary(organizationId: string): Promise<DepreciationSummary> {
    const report = await this.getDepreciationReport(organizationId);
    return {
      totalAssets: report.length,
      totalCost: round2(report.reduce((s, r) => s + r.purchaseCost, 0)),
      totalAccumulatedDepreciation: round2(report.reduce((s, r) => s + r.accumulatedDepreciation, 0)),
      totalBookValue: round2(report.reduce((s, r) => s + r.bookValue, 0)),
    };
  },

  async getAssetDisposals(organizationId: string) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: { organizationId, type: 'asset_disposal' },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
    return (memories as Array<{ id: string; content: string; createdAt: Date; sourceId: string | null }>).map((m) => {
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(m.content); } catch { data = {}; }
      return { id: m.id, ...data, recordedAt: m.createdAt };
    });
  },

  async recordDisposal(organizationId: string, workspaceId: string, input: DisposalInput, createdBy: string) {
    const asset = await safePrisma(() =>
      prisma.iTAsset.findUnique({ where: { id: input.itAssetId } }),
    null);
    const assetName = asset ? (asset as ITAssetRow).name : '';
    const content = JSON.stringify({
      itAssetId: input.itAssetId,
      assetName,
      disposalDate: input.disposalDate.toISOString(),
      disposalMethod: input.disposalMethod,
      disposalValue: input.disposalValue,
      reason: input.reason?.slice(0, 5000) || '',
    });
    const memory = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'asset_disposal',
        content,
        source: 'user',
        sourceId: createdBy,
        tags: JSON.stringify([input.disposalMethod]),
        createdBy,
      },
    });
    // Mark the asset as retired
    await prisma.iTAsset.update({
      where: { id: input.itAssetId },
      data: { status: 'retired' },
    }).catch(() => null);
    return memory;
  },

  generateAssetTag(itAssetId: string): string {
    return `ASSET:${itAssetId}`;
  },

  async getAssetTags(organizationId: string): Promise<AssetTag[]> {
    const assets = await safePrisma(() =>
      prisma.iTAsset.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
        take: 500,
        select: { id: true, name: true, assetTag: true, serialNumber: true },
      }),
    []);
    return (assets as Array<{ id: string; name: string; assetTag: string; serialNumber: string }>).map((a) => ({
      assetId: a.id,
      name: a.name,
      tag: `ASSET:${a.id}:${a.name}`,
      assetTag: a.assetTag,
      serialNumber: a.serialNumber,
    }));
  },
};

function computeDepreciation(asset: ITAssetRow): DepreciationResult | null {
  const cost = asset.purchaseCost ?? 0;
  if (cost <= 0) {
    return {
      assetId: asset.id,
      name: asset.name,
      purchaseCost: 0,
      salvageValue: 0,
      usefulLifeYears: 0,
      annualDepreciation: 0,
      accumulatedDepreciation: 0,
      bookValue: 0,
      depreciationRate: 0,
      yearsElapsed: 0,
    };
  }
  const meta = parseMeta(asset.metadata);
  const salvageValue = meta.salvageValue ?? 0;
  const usefulLifeYears = meta.usefulLifeYears ?? 5;
  if (usefulLifeYears <= 0) {
    return {
      assetId: asset.id,
      name: asset.name,
      purchaseCost: cost,
      salvageValue,
      usefulLifeYears,
      annualDepreciation: 0,
      accumulatedDepreciation: 0,
      bookValue: cost,
      depreciationRate: 0,
      yearsElapsed: 0,
    };
  }
  const annualDepreciation = (cost - salvageValue) / usefulLifeYears;
  const now = new Date();
  const yearsElapsed = asset.purchaseDate
    ? Math.max(0, (now.getTime() - asset.purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0;
  const accumulatedDepreciation = Math.min(cost - salvageValue, annualDepreciation * yearsElapsed);
  const bookValue = Math.max(salvageValue, cost - accumulatedDepreciation);
  const depreciationRate = cost > 0 ? (accumulatedDepreciation / cost) * 100 : 0;
  return {
    assetId: asset.id,
    name: asset.name,
    purchaseCost: round2(cost),
    salvageValue: round2(salvageValue),
    usefulLifeYears,
    annualDepreciation: round2(annualDepreciation),
    accumulatedDepreciation: round2(accumulatedDepreciation),
    bookValue: round2(bookValue),
    depreciationRate: round2(depreciationRate),
    yearsElapsed: round2(yearsElapsed),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
