/**
 * Marketing Studio storyboard plan validation (handwritten, style aligned with product-ad-lab/schema.ts, no third-party deps).
 */
export interface AdShot {
  i: number;
  shot: string; // this shot's framing/composition/shot size (English)
  prompt: string; // action + camera motion + dialogue (English, dialogue in double quotes, fed to Seedance 2.0)
}

export interface MarketingPlan {
  title: string;
  ratio: string;
  formatId: string;
  product: string; // English product anchor (repeated per shot, locks consistency)
  character: string; // English character description (can be empty)
  scene: string; // English scene
  shots: AdShot[];
}

function rec(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('invalid_plan');
  return v as Record<string, unknown>;
}
function str(source: Record<string, unknown>, key: string, fallback = ''): string {
  const v = source[key];
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (fallback !== '') return fallback;
  throw new Error(`invalid_plan.${key}`);
}
function optStr(source: Record<string, unknown>, key: string): string {
  const v = source[key];
  return typeof v === 'string' ? v.trim() : '';
}

export function parseMarketingPlan(value: unknown): MarketingPlan {
  const root = rec(value);
  const rawShots = Array.isArray(root.shots) ? root.shots : [];
  const shots: AdShot[] = rawShots
    .map((s, idx): AdShot | null => {
      if (!s || typeof s !== 'object') return null;
      const o = s as Record<string, unknown>;
      const shot = typeof o.shot === 'string' ? o.shot.trim() : '';
      const prompt = typeof o.prompt === 'string' ? o.prompt.trim() : '';
      if (!prompt) return null;
      return { i: typeof o.i === 'number' ? o.i : idx + 1, shot, prompt };
    })
    .filter((s): s is AdShot => s !== null)
    .slice(0, 8);
  if (shots.length === 0) throw new Error('invalid_plan.shots');

  return {
    title: str(root, 'title', '产品广告'),
    ratio: str(root, 'ratio', '9:16'),
    formatId: str(root, 'formatId', 'ugc'),
    product: str(root, 'product'),
    character: optStr(root, 'character'),
    scene: optStr(root, 'scene'),
    shots,
  };
}

export const marketingPlanSchema = {
  parse: parseMarketingPlan,
  safeParse(value: unknown): { success: true; data: MarketingPlan } | { success: false; error: Error } {
    try {
      return { success: true, data: parseMarketingPlan(value) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
};
