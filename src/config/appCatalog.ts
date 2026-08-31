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
  'ad-headline-generator': { en: 'Ad Headline Generator', zh: '广告标题生成器' },
  'angle-finder': { en: 'Creative Angle Finder', zh: '创意角度发现器' },
  'ad-timing-optimizer': { en: 'Ad Timing Optimizer', zh: '广告时段优化器' },
  'creative-fatigue-detector': { en: 'Creative Fatigue Detector', zh: '创意疲劳检测器' },
  'ad-cta-optimizer': { en: 'Ad CTA Optimizer', zh: '广告CTA优化器' },
  'concept-expander': { en: 'Creative Concept Expander', zh: '创意概念扩展器' },
  'ad-story-generator': { en: 'Ad Story Generator', zh: '广告故事生成器' },
  'ad-color-palette-generator': { en: 'Ad Color Palette Generator', zh: '广告配色生成器' },
  'ad-thumbnail-generator': { en: 'Ad Thumbnail Generator', zh: '广告缩略图生成器' },
  'ad-font-pairing-generator': { en: 'Ad Font Pairing Generator', zh: '广告字体搭配生成器' },
  'ad-hashtag-generator': { en: 'Ad Hashtag Generator', zh: '广告标签生成器' },
  'creative-scene-generator': { en: 'Creative Scene Generator', zh: '创意场景生成器' },
  'ad-music-mood-matcher': { en: 'Ad Music Mood Matcher', zh: '广告音乐匹配器' },
  'ad-voiceover-script-generator': { en: 'Ad Voiceover Script Generator', zh: '广告配音脚本生成器' },
  'creative-brief-generator': { en: 'Creative Brief Generator', zh: '创意简报生成器' },
  'ad-placement-strategist': { en: 'Ad Placement Strategist', zh: '广告投放策略师' },
  'ad-ab-test-name-generator': { en: 'Ad A/B Test Name Generator', zh: '广告A/B测试名称生成器' },
  'creative-hook-revamp-generator': { en: 'Creative Hook Revamp Generator', zh: '创意钩子改造生成器' },
  'ad-audience-segment-builder': { en: 'Ad Audience Segment Builder', zh: '广告受众细分构建器' },
  'creative-concept-validator': { en: 'Creative Concept Validator', zh: '创意概念验证器' },
  'ad-emotion-analyzer': { en: 'Ad Emotion Analyzer', zh: '广告情感分析器' },
  'creative-format-converter': { en: 'Creative Format Converter', zh: '创意格式转换器' },
  'ad-budget-allocator': { en: 'Ad Budget Allocator', zh: '广告预算分配器' },
  'creative-trend-adapter': { en: 'Creative Trend Adapter', zh: '创意趋势适配器' },
  'ad-creative-sequencer': { en: 'Ad Creative Sequencer', zh: '广告创意排序器' },
  'brand-story-architect': { en: 'Brand Story Architect', zh: '品牌故事架构师' },
  'ad-localization-adapter': { en: 'Ad Localization Adapter', zh: '广告本地化适配器' },
  'creative-performance-forecaster': { en: 'Creative Performance Forecaster', zh: '创意表现预测器' },
  'ad-sentiment-tuner': { en: 'Ad Sentiment Tuner', zh: '广告情感调优器' },
  'creative-hook-matrix-generator': { en: 'Creative Hook Matrix Generator', zh: '创意钩子矩阵生成器' },
  'ad-creative-rotator': { en: 'Ad Creative Rotator', zh: '广告创意轮换器' },
  'brand-voice-consistency-checker': { en: 'Brand Voice Consistency Checker', zh: '品牌声音一致性检查器' },
  'ad-persona-matcher': { en: 'Ad Persona Matcher', zh: '广告人设匹配器' },
  'creative-concept-expander-pro': { en: 'Creative Concept Expander Pro', zh: '创意概念扩展器 Pro' },
  'ad-competitive-intelligence': { en: 'Ad Competitive Intelligence', zh: '广告竞争情报' },
  'creative-quality-scorer': { en: 'Creative Quality Scorer', zh: '创意质量评分器' },
  'ad-audience-resonance-predictor': { en: 'Ad Audience Resonance Predictor', zh: '广告受众共鸣预测器' },
  'creative-format-recommender': { en: 'Creative Format Recommender', zh: '创意格式推荐器' },
  'ad-creative-lifecycle-manager': { en: 'Ad Creative Lifecycle Manager', zh: '广告创意生命周期管理器' },
  'creative-sentiment-journey-mapper': { en: 'Creative Sentiment Journey Mapper', zh: '创意情感旅程映射器' },
  'ad-creative-ab-test-simulator': { en: 'Ad Creative A/B Test Simulator', zh: '广告创意A/B测试模拟器' },
  'creative-visual-hierarchy-analyzer': { en: 'Creative Visual Hierarchy Analyzer', zh: '创意视觉层次分析器' },
  'ad-audience-pain-point-mapper': { en: 'Ad Audience Pain Point Mapper', zh: '广告受众痛点映射器' },
  'creative-messaging-framework-builder': { en: 'Creative Messaging Framework Builder', zh: '创意信息框架构建器' },
  'ad-creative-burnout-detector': { en: 'Ad Creative Burnout Detector', zh: '广告创意疲劳检测器' },
  'creative-ad-concept-synthesizer': { en: 'Creative Ad Concept Synthesizer', zh: '创意广告概念合成器' },
  'ad-audience-psychographic-profiler': { en: 'Ad Audience Psychographic Profiler', zh: '广告受众心理画像器' },
  'creative-ad-tone-calibrator': { en: 'Creative Ad Tone Calibrator', zh: '创意广告语调校准器' },
  'creative-ad-format-innovator': { en: 'Creative Ad Format Innovator', zh: '创意广告格式创新器' },
  'ad-creative-story-arc-designer': { en: 'Ad Creative Story Arc Designer', zh: '广告创意故事弧设计器' },
  'creative-ad-persuasion-strategist': { en: 'Creative Ad Persuasion Strategist', zh: '创意广告说服策略师' },
  'ad-creative-hook-timing-optimizer': { en: 'Ad Creative Hook Timing Optimizer', zh: '广告创意钩子时机优化器' },
  'creative-ad-metaphor-generator': { en: 'Creative Ad Metaphor Generator', zh: '创意广告隐喻生成器' },
  'ad-creative-sensory-enhancer': { en: 'Ad Creative Sensory Enhancer', zh: '广告创意感官增强器' },
  'creative-ad-pattern-interrupt-designer': { en: 'Creative Ad Pattern Interrupt Designer', zh: '创意广告模式打断设计器' },
  'ad-creative-social-proof-architect': { en: 'Ad Creative Social Proof Architect', zh: '广告创意社会证据架构师' },
  'creative-ad-anticipation-builder': { en: 'Creative Ad Anticipation Builder', zh: '创意广告期待构建器' },
  'ad-creative-contrast-amplifier': { en: 'Ad Creative Contrast Amplifier', zh: '广告创意对比放大器' },
  'creative-ad-micro-moment-designer': { en: 'Creative Ad Micro-Moment Designer', zh: '创意广告微时刻设计器' },
  'ad-creative-emotion-sequencer': { en: 'Ad Creative Emotion Sequencer', zh: '广告创意情感序列器' },
  'creative-ad-narrative-twist-designer': { en: 'Creative Ad Narrative Twist Designer', zh: '创意广告叙事反转设计师' },
  'ad-creative-memory-anchor-builder': { en: 'Ad Creative Memory Anchor Builder', zh: '广告创意记忆锚点构建器' },
  'creative-ad-tension-release-strategist': { en: 'Creative Ad Tension Release Strategist', zh: '创意广告张力释放策略师' },
  'ad-creative-sensory-contrast-designer': { en: 'Ad Creative Sensory Contrast Designer', zh: '广告创意感官对比设计师' },
  'creative-ad-curiosity-gap-designer': { en: 'Creative Ad Curiosity Gap Designer', zh: '创意广告好奇心缺口设计师' },
  'ad-creative-rhythm-pacing-optimizer': { en: 'Ad Creative Rhythm Pacing Optimizer', zh: '广告创意节奏优化器' },
  'creative-ad-visual-hierarchy-strategist': { en: 'Creative Ad Visual Hierarchy Strategist', zh: '创意广告视觉层次策略师' },
  'ad-creative-sound-design-strategist': { en: 'Ad Creative Sound Design Strategist', zh: '广告创意声音设计策略师' },
  'creative-ad-surprise-element-designer': { en: 'Creative Ad Surprise Element Designer', zh: '创意广告惊喜元素设计师' },
  'ad-creative-callback-memory-designer': { en: 'Ad Creative Callback Memory Designer', zh: '广告创意回调记忆设计师' },
  'creative-ad-climax-architect': { en: 'Creative Ad Climax Architect', zh: '创意广告高潮架构师' },
  'ad-creative-pacing-variability-designer': { en: 'Ad Creative Pacing Variability Designer', zh: '广告创意节奏变异性设计师' },
  'creative-ad-foreshadowing-designer': { en: 'Creative Ad Foreshadowing Designer', zh: '创意广告伏笔设计师' },
  'ad-creative-emotional-pivot-designer': { en: 'Ad Creative Emotional Pivot Designer', zh: '广告创意情感转折设计师' },
  'creative-ad-resolution-designer': { en: 'Creative Ad Resolution Designer', zh: '创意广告结局设计师' },
  'ad-creative-viewer-reward-designer': { en: 'Ad Creative Viewer Reward Designer', zh: '广告创意观众奖励设计师' },
  'ad-creative-tension-release-designer': { en: 'Ad Creative Tension Release Designer', zh: '广告创意张力释放设计师' },
  'creative-ad-stakes-escalation-designer': { en: 'Creative Ad Stakes Escalation Designer', zh: '创意广告风险升级设计师' },
  'ad-creative-curiosity-loop-designer': { en: 'Ad Creative Curiosity Loop Designer', zh: '广告创意好奇心循环设计师' },
  'creative-ad-transformation-arc-designer': { en: 'Creative Ad Transformation Arc Designer', zh: '创意广告转变弧设计师' },
  'ad-creative-emotional-anchor-designer': { en: 'Ad Creative Emotional Anchor Designer', zh: '广告创意情感锚点设计师' },
  'creative-ad-empathy-bridge-designer': { en: 'Creative Ad Empathy Bridge Designer', zh: '创意广告共情桥梁设计师' },
  'ad-creative-belief-shift-designer': { en: 'Ad Creative Belief Shift Designer', zh: '广告创意信念转变设计师' },
  'creative-ad-desire-amplifier-designer': { en: 'Creative Ad Desire Amplifier Designer', zh: '创意广告渴望放大器设计师' },
  'ad-creative-trust-accelerator-designer': { en: 'Ad Creative Trust Accelerator Designer', zh: '广告创意信任加速器设计师' },
  'creative-ad-urgency-catalyst-designer': { en: 'Creative Ad Urgency Catalyst Designer', zh: '创意广告紧迫感催化剂设计师' },
  'ad-creative-social-momentum-designer': { en: 'Ad Creative Social Momentum Designer', zh: '广告创意社交势能设计师' },
  'creative-ad-value-ladder-designer': { en: 'Creative Ad Value Ladder Designer', zh: '创意广告价值阶梯设计师' },
  'ad-creative-objection-neutralizer-designer': { en: 'Ad Creative Objection Neutralizer Designer', zh: '广告创意异议中和器设计师' },
  'creative-ad-micro-commitment-designer': { en: 'Creative Ad Micro-Commitment Designer', zh: '创意广告微承诺设计师' },
  'ad-creative-scarcity-frame-designer': { en: 'Ad Creative Scarcity Frame Designer', zh: '广告创意稀缺框架设计师' },
  'creative-ad-identity-alignment-designer': { en: 'Creative Ad Identity Alignment Designer', zh: '创意广告身份对齐设计师' },
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
  'ad-headline-generator': { en: 'AI-powered ad headlines — generate attention-grabbing headlines optimized for specific platforms', zh: 'AI驱动的广告标题 — 生成针对特定平台优化的吸睛标题' },
  'angle-finder': { en: 'AI-powered angle discovery — find unique marketing angles across psychological triggers', zh: 'AI驱动的角度发现 — 跨心理触发器发现独特营销角度' },
  'ad-timing-optimizer': { en: 'AI-powered ad timing — find the optimal times to run ads based on platform, audience, and timezone', zh: 'AI驱动的广告时段 — 根据平台、受众和时区找到最佳投放时间' },
  'creative-fatigue-detector': { en: 'AI-powered fatigue detection — detect when creatives need refreshing from performance metrics', zh: 'AI驱动的疲劳检测 — 从表现指标检测创意何时需要更新' },
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
