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

// Custom titles/descriptions for premium apps (some without i18n key, given directly)
type Bi = { en: string; zh: string };
const CUSTOM_TITLES: Record<string, Bi> = {
  'lazynext-studio': { en: 'UGC Product Ad', zh: '产品口播广告' },
  'ad-reference': { en: 'Reference to Ad', zh: '爆款广告复刻' },
  'drama-studio': { en: 'AI Drama Ad', zh: 'AI 短剧广告' },
  'ad-skit': { en: 'Ad Skit', zh: '搞笑带货小剧场' },
  'creative-studio': { en: 'Creative Studio', zh: '创意工作室' },
  'product-brief': { en: 'Product Brief', zh: '产品简报' },
  'reference-remix': { en: 'Reference Remix', zh: '参考复刻' },
  'multi-concept': { en: 'Multi-Concept', zh: '多概念钩子' },
  'meta-safety': { en: 'Meta Safety', zh: 'Meta安全' },
  'google-safety': { en: 'Google Safety', zh: 'Google安全' },
  'performance-loop': { en: 'Performance Loop', zh: '表现闭环' },
  'viral-analyzer': { en: 'Viral Analyzer', zh: '病毒分析器' },
  'skill-chains': { en: 'Skill Chains', zh: '技能链' },
  'brand-guardrails': { en: 'Brand Guardrails', zh: '品牌护栏' },
  'smart-calendar': { en: 'Smart Calendar', zh: '智能日历' },
  'competitor-watch': { en: 'Competitor Watch', zh: '竞品监控' },
  'ad-copy-generator': { en: 'Ad Copy Generator', zh: '广告文案生成器' },
  'hook-library': { en: 'Hook Library', zh: '钩子库' },
  'brief-template-builder': { en: 'Brief Template Builder', zh: '简报模板构建器' },
  'ad-script-writer': { en: 'Ad Script Writer', zh: '广告脚本编写器' },
  'audience-persona-generator': { en: 'Audience Persona Generator', zh: '受众画像生成器' },
  'variant-matrix-generator': { en: 'Creative Variant Matrix', zh: '创意变体矩阵' },
  'ad-concept-merger': { en: 'Ad Concept Merger', zh: '广告概念合并器' },
  'brief-analyzer': { en: 'Creative Brief Analyzer', zh: '创意简报分析器' },
  'ad-format-optimizer': { en: 'Ad Format Optimizer', zh: '广告格式优化器' },
  'mood-board-generator': { en: 'Mood Board Generator', zh: '情绪板生成器' },
  'ad-performance-predictor': { en: 'Ad Performance Predictor', zh: '广告表现预测器' },
  'ab-test-planner': { en: 'Creative A/B Test Planner', zh: '创意A/B测试规划器' },
  'hook-tester': { en: 'Creative Hook Tester', zh: '创意钩子测试器' },
  'trend-spotter': { en: 'Trend Spotter', zh: '趋势发现器' },
  'brand-voice-analyzer': { en: 'Brand Voice Analyzer', zh: '品牌声音分析器' },
  'ad-caption-generator': { en: 'Ad Caption Generator', zh: '广告文案生成器' },
};
const CUSTOM_DESCS: Record<string, Bi> = {
  'lazynext-studio': { en: 'Product + presenter photos → AI expands the prompt from your images → lip-synced UGC ad; one-click viral formats', zh: '产品图+人物图 → AI 看图扩写提示词 → 合成首帧 → 对口型真人口播广告;爆款玩法一键复刻' },
  'ad-reference': { en: 'Upload a viral reference video + your product/presenter (script auto-written) → remake it as your own ad', zh: '上传爆款参考视频 + 你的产品图/人物图(脚本可自动生成)→ 复刻成你自己的同款广告' },
  'drama-studio': { en: 'One topic → comedy script → cast/scene/product reference images lock consistency → shot-by-shot drama ad', zh: '一句主题 → AI 写反差喜剧剧本 → 角色/场景/产品定妆图锁一致 → 逐镜出片拼成短剧' },
  'ad-skit': { en: 'One-line product (+photos) → two-hander comedy script → 15s skit with audio (multilingual)', zh: '一行产品卖点(可配产品图)→ AI 写双人搞笑剧本 → 渲染 15 秒带声短剧(多语言)' },
  'creative-studio': { en: 'URL → brand intelligence → creative brief → hooks → angles → script → storyboard. AI creative strategy before generation.', zh: 'URL → 品牌智能 → 创意简报 → 钩子 → 角度 → 脚本 → 分镜。生成前的 AI 创意策略。' },
  'product-brief': { en: 'URL → product intelligence → ad angles → scripts → storyboard → generation prompt', zh: 'URL → 产品智能 → 广告角度 → 脚本 → 分镜 → 生成提示词' },
  'reference-remix': { en: 'Analyze a reference ad, extract what works, and generate a remix brief for your product', zh: '分析参考广告，提取成功要素，为你的产品生成复刻简报' },
  'multi-concept': { en: 'Generate 6 divergent ad concepts across psychological triggers in one pass', zh: '一次性生成6个跨心理触发器的差异化广告概念' },
  'meta-safety': { en: 'Dry-run, approval workflow, spend caps, and audit log for Meta Ads mutations', zh: 'Meta广告变更的试运行、审批流程、支出上限和审计日志' },
  'google-safety': { en: 'Dry-run, approval workflow, spend caps, and audit log for Google Ads mutations', zh: 'Google广告变更的试运行、审批流程、支出上限和审计日志' },
  'performance-loop': { en: 'Turn past campaign performance into improved creative briefs with an Atlas-ready prompt', zh: '将过往广告表现转化为改进的创意简报和Atlas就绪的提示词' },
  'viral-analyzer': { en: 'Dissect what makes content viral — hooks, pacing, emotional triggers, shareability', zh: '剖析内容病毒式传播的要素 — 钩子、节奏、情感触发、分享性' },
  'skill-chains': { en: 'Multi-step creative skill chains with conditional branching and A/B forking', zh: '带条件分支和A/B分叉的多步骤创意技能链' },
  'brand-guardrails': { en: 'AI-powered brand consistency checker — analyze creatives against your brand kit for voice, visual, and messaging compliance', zh: 'AI驱动的品牌一致性检查器 — 根据品牌套件分析创意的语音、视觉和信息合规性' },
  'smart-calendar': { en: 'Multi-platform content calendar with AI-suggested optimal posting times', zh: '多平台内容日历，AI推荐最佳发布时间' },
  'competitor-watch': { en: 'Monitor competitor ads with automatic creative analysis and strategic alerts', zh: '监控竞品广告，自动创意分析和战略提醒' },
  'ad-copy-generator': { en: 'AI-powered platform-specific ad copy — generate TikTok, Instagram, and YouTube copy from a product URL or brief', zh: 'AI驱动的平台专属广告文案 — 从产品URL或简报生成TikTok、Instagram和YouTube文案' },
  'hook-library': { en: 'AI-powered hook library — generate, categorize, and store reusable hooks by emotional trigger and platform', zh: 'AI驱动的钩子库 — 按情感触发器和平台生成、分类和存储可复用钩子' },
  'brief-template-builder': { en: 'AI-powered creative brief templates with industry-specific presets and smart suggestions', zh: 'AI驱动的创意简报模板，行业专属预设和智能建议' },
  'ad-script-writer': { en: 'AI-powered multi-scene ad scripts with visual cues, voiceover, B-roll notes, and timing for TikTok, YouTube, and Instagram', zh: 'AI驱动的多场景广告脚本，包含视觉提示、配音、B-roll注释和时长，适用于TikTok、YouTube和Instagram' },
  'audience-persona-generator': { en: 'AI-powered audience personas with demographics, psychographics, pain points, and platform behavior', zh: 'AI驱动的受众画像，包含人口统计、心理特征、痛点和平台行为' },
  'variant-matrix-generator': { en: 'AI-powered creative variant matrix across hooks, angles, formats, and platforms for A/B testing', zh: 'AI驱动的创意变体矩阵，跨钩子、角度、格式和平台进行A/B测试' },
  'ad-concept-merger': { en: 'AI-powered concept merger — combine multiple hooks, angles, and scripts into one unified ad concept', zh: 'AI驱动的概念合并器 — 将多个钩子、角度和脚本合并为一个统一的广告概念' },
  'brief-analyzer': { en: 'AI-powered brief analyzer — audit creative briefs for strengths, gaps, and improvement suggestions', zh: 'AI驱动的简报分析器 — 审查创意简报的优势、差距和改进建议' },
  'ad-format-optimizer': { en: 'AI-powered format optimizer — recommends the best ad format based on product, audience, platform, and budget', zh: 'AI驱动的格式优化器 — 根据产品、受众、平台和预算推荐最佳广告格式' },
  'mood-board-generator': { en: 'AI-powered mood boards — generate color palettes, typography, imagery themes, and emotional tone from your brand and style keywords', zh: 'AI驱动的情绪板 — 从品牌和风格关键词生成配色、字体、图像主题和情感基调' },
  'ad-performance-predictor': { en: 'AI-powered ad performance prediction — forecast CTR, engagement, conversion, and virality before you spend budget', zh: 'AI驱动的广告表现预测 — 在花费预算前预测CTR、互动率、转化和病毒传播潜力' },
  'ab-test-planner': { en: 'AI-powered A/B test planner — design rigorous experiments with hypothesis, variants, sample size, and success criteria', zh: 'AI驱动的A/B测试规划器 — 设计包含假设、变体、样本量和成功标准的严谨实验' },
  'hook-tester': { en: 'AI-powered hook testing — rank multiple ad hooks by predicted performance before you launch', zh: 'AI驱动的钩子测试 — 在发布前按预测表现对多个广告钩子排名' },
  'trend-spotter': { en: 'AI-powered trend discovery — identify trending topics, hashtags, and content styles for your niche', zh: 'AI驱动的趋势发现 — 为你的细分领域识别热门话题、标签和内容风格' },
  'brand-voice-analyzer': { en: 'AI-powered brand voice analysis — extract tone, personality, and style guidelines from your content', zh: 'AI驱动的品牌声音分析 — 从内容中提取语调、个性和风格指南' },
  'ad-caption-generator': { en: 'AI-powered ad captions — generate platform-specific captions with emojis, hashtags, and CTAs', zh: 'AI驱动的广告文案 — 生成带表情符号、标签和CTA的平台专属文案' },
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
