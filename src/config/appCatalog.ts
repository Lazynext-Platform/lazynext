// App status classification (per "Feature Review.md"), shared by home page and dashboard for consistency.
export type AppCat = 'production' | 'nocreative' | 'incomplete';

// ✅ Production-ready: real moat / multi-step pipeline. After streamlining, repo only keeps 4 premium apps.
export const PRODUCTION_ROUTES = new Set<string>([
  '/lazynext-studio', '/ad-reference', '/drama-studio', '/ad-skit',
]);

// ⭐ Premium: flagship apps that are polished and can be promoted externally
// Streamlined launch: home page only promotes these 4 polished apps (product voiceover ad / viral ad remake / AI drama ad / comedy product skit).
// Naming note: "Reference to Ad" and "AI Drama Ad" names are from the Lark requirements doc, don't change; the other two are named by actual function.
// Other app pages still exist, just not shown in the home premium section.
export const FEATURED_ROUTES = new Set<string>(['/lazynext-studio', '/ad-reference', '/drama-studio', '/ad-skit']);
export function isFeatured(href: string): boolean {
  return FEATURED_ROUTES.has(href);
}

// 🔴 Incomplete: pure frontend shell / LLM text only / mislabeled. None after streamlining.
export const INCOMPLETE_ROUTES = new Set<string>([]);

// Others = 🟡 Works but no moat (single-step generic model, GPT / Doubao one-step replaceable)
export function catOf(href: string): AppCat {
  return PRODUCTION_ROUTES.has(href) ? 'production' : INCOMPLETE_ROUTES.has(href) ? 'incomplete' : 'nocreative';
}

export const CAT_META: { key: AppCat; label: string; desc: string; dot: string; ring: string }[] = [
  { key: 'production', label: '✅ Production-ready', desc: 'Real moat / multi-step pipeline', dot: 'bg-green-500', ring: 'ring-green-300' },
  { key: 'nocreative', label: '🟡 Works, no moat', desc: 'Single-step generic model, easily replaced', dot: 'bg-amber-500', ring: 'ring-amber-300' },
  { key: 'incomplete', label: '🔴 Incomplete', desc: 'Shell / text-only / mislabeled', dot: 'bg-red-500', ring: 'ring-red-300' },
];

// Custom titles/descriptions for 4 premium apps (some without i18n key, given directly)
type Bi = { en: string; zh: string };
const CUSTOM_TITLES: Record<string, Bi> = {
  'lazynext-studio': { en: 'UGC Product Ad', zh: '产品口播广告' },
  'ad-reference': { en: 'Reference to Ad', zh: '爆款广告复刻' },
  'drama-studio': { en: 'AI Drama Ad', zh: 'AI 短剧广告' },
  'ad-skit': { en: 'Ad Skit', zh: '搞笑带货小剧场' },
};
const CUSTOM_DESCS: Record<string, Bi> = {
  'lazynext-studio': { en: 'Product + presenter photos → AI expands the prompt from your images → lip-synced UGC ad; one-click viral formats', zh: '产品图+人物图 → AI 看图扩写提示词 → 合成首帧 → 对口型真人口播广告;爆款玩法一键复刻' },
  'ad-reference': { en: 'Upload a viral reference video + your product/presenter (script auto-written) → remake it as your own ad', zh: '上传爆款参考视频 + 你的产品图/人物图(脚本可自动生成)→ 复刻成你自己的同款广告' },
  'drama-studio': { en: 'One topic → comedy script → cast/scene/product reference images lock consistency → shot-by-shot drama ad', zh: '一句主题 → AI 写反差喜剧剧本 → 角色/场景/产品定妆图锁一致 → 逐镜出片拼成短剧' },
  'ad-skit': { en: 'One-line product (+photos) → two-hander comedy script → 15s skit with audio (multilingual)', zh: '一行产品卖点(可配产品图)→ AI 写双人搞笑剧本 → 渲染 15 秒带声短剧(多语言)' },
};
export function appTitle(id: string, fallbackTitle: string, locale: string = 'en'): string {
  const c = CUSTOM_TITLES[id];
  if (!c) return fallbackTitle;
  // For en/zh use the custom override; for all other locales use the
  // translated fallback from appMessages (which is already locale-specific).
  if (locale === 'en') return c.en;
  if (locale === 'zh') return c.zh;
  return fallbackTitle;
}
export function appDesc(id: string, fallbackDesc: string, locale: string = 'en'): string {
  const c = CUSTOM_DESCS[id];
  if (!c) return fallbackDesc;
  if (locale === 'en') return c.en;
  if (locale === 'zh') return c.zh;
  return fallbackDesc;
}
