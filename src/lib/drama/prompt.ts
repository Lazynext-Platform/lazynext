import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

// Script quality first. 2026-07-14 testing: openai/gpt-5.5 reliably produces 3-character, full-storyboard JSON scripts;
// doubao 2.1 turbo/pro approaches or exceeds 120s in production, flash is fast but quality doesn't meet Drama Studio's target.
// 2026-07-15 new prompt A/B test (same topic: braised beef noodle comedy): gpt-5.5 30s dialogue is colloquial and punchy, clearly the best;
// gemini 26s but written/stilted tone (user review: "script is terrible"); deepseek 35s slightly rough; glm 65s+ broken JSON.
// Old 502 root cause was old prompt's verbose output causing ~53s occasional timeout on CF side; new prompt output is concise (~2.5k chars, 30s), gpt-5.5 back as primary, gemini as fallback.
export const DRAMA_SCRIPT_MODEL = process.env.DRAMA_MODEL || 'openai/gpt-5.5';
export const DRAMA_SCRIPT_FALLBACK_MODEL = process.env.DRAMA_FALLBACK_MODEL || 'google/gemini-2.5-flash';

/** Resolve drama script model, respecting env override and plan-tier routing. */
export function getDramaScriptModel(planTier?: PlanTier): string {
  return process.env.DRAMA_MODEL || getLLMModel(planTier);
}

function envInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

// Cloudflare request still needs a little time to refund and return a clear error before the 120s edge.
// Default to waiting for the real Atlas script as long as practical.
const SCRIPT_TIMEOUT_MS = envInt(process.env.DRAMA_SCRIPT_TIMEOUT_MS || process.env.ATLASCLOUD_CHAT_TIMEOUT_MS, 110_000, 10_000, 115_000);
const SCRIPT_MAX_TOKENS = envInt(process.env.DRAMA_SCRIPT_MAX_TOKENS, 6_500, 4_000, 12_000);

// Film/TV IP mashup / character contrast style presets (derived from multiref-demo/gen_got.py's "Game of Thrones selling tissues" creative pattern, generalized into multiple styles)
export const DRAMA_STYLES = [
  { id: 'epic', label: 'Epic Fantasy', zh: '史诗奇幻', emoji: '⚔️', hint: '史诗、权谋、严肃庄重的气场,放进现代/日常场景形成强反差(如史诗英雄一本正经卖平价日用品)' },
  { id: 'palace', label: 'Palace Intrigue', zh: '宫斗权谋', emoji: '👑', hint: '深宫算计、步步为营、绵里藏针的台词张力' },
  { id: 'wuxia', label: 'Martial Arts Wuxia', zh: '武侠江湖', emoji: '🗡️', hint: '侠客恩怨、江湖道义、快意恩仇的气口' },
  { id: 'family', label: 'Family Drama', zh: '中式家庭', emoji: '🍜', hint: '催婚/见家长/丈母娘考验等中式家庭日常的夸张戏剧化(如社恐程序员见挑剔丈母娘)' },
  { id: 'office', label: 'Office Politics', zh: '职场斗争', emoji: '💼', hint: '办公室政治、KPI 内卷、老板的荒诞与打工人的心声' },
  { id: 'hero', label: 'Superhero', zh: '超级英雄', emoji: '🦸', hint: '拯救世界的宏大使命 vs 鸡毛蒜皮日常的强反差' },
];

// Standard film/TV workflow: first define character designs/scenes ("costume reference photos"), then generate each shot using reference images to lock consistency.
// Therefore the script output must provide enough: ① each character gets an English appearance description (for generating "costume reference photos"); ② each segment labels appearing characters (cast) + duration (durationSec, AI decides by pacing); ③ an English scene image prompt.
const SYS = `你是顶级短剧编剧 + 病毒式带货短视频导演,擅长把强风格化角色(史诗/宫斗/武侠…)扔进现代日常场景,用"一本正经地荒诞"制造笑点。你产出的剧本会进入正规影视流程:先按你写的外观生成角色定妆图、场景图、产品参考图,再逐镜用参考图锁一致性出片。用原创角色名(不照搬有版权人物),保留该风格的味道。
剧本质量硬标准:
① 开场 3 秒钩子必须是一个拍得出来的具体画面动作冲突(不是概念、不是气氛);
② 笑点靠反差与错位:角色用自己世界的逻辑严肃对待日常小事;每段至少 1 个可笑的具体细节(动作/道具/台词),拒绝泛泛地"搞笑";
③ 台词一律口语短句,像真人拌嘴,带梗、一针见血;禁止书面腔/旁白腔/口号腔(类似「此乃吾之战利品」「这就是XX的力量」一律禁用);dialogue 格式:角色名：「台词」,多人对话用空格分隔;
④ 带货剧:卖点严禁念参数,必须转化成人物的欲望/冲突/破功瞬间(如为大块牛肉翻脸、闻到香气忘词);最后一段要有反转式收尾 + 让人想买的自然暗示;
⑤ 段与段承接成完整闭环(起势→升级→反转),不是独立段子拼盘。
技术要求:
⑥ **分镜数量严格按用户要求**(未指定时 4-6 段、至少 4 段);**每段 durationSec 由你按节奏定**(整数 4-12:钩子短 4-6s,对峙/高潮长 8-12s);
⑦ 每段 cast 列出该段出场角色的 key;每个角色写 **≥40 词英文 appearance**(年龄/性别/发型/服装材质配色/体型/标志性道具/神态/布光,多角色外观差异明显);
⑧ 若主题涉及实物商品:必须给 **productImagePrompt**(ENGLISH,干净棚拍包装图,写清品类/包装形态/主色/包装上的中文品名文字),产品出镜的段标 **product:true**(带货主题至少一半段落标 true),全剧必须是同一件产品;纯剧情则 productImagePrompt 给空字符串、所有段 product:false;
⑨ **JSON 安全(极重要)**:所有字符串值里一律不得出现英文双引号字符(会截断 JSON 导致分镜丢失),台词/强调/引用一律用中文引号「」。
⑩ **输出语言必须自动匹配用户【主题/产品】文本所用的语种**(用户用什么语言写主题,剧本就用什么语言,支持中/英/日/韩/西等任意语种):除 appearance(恒英文,供出图)外,title/logline/setting/scene/action/dialogue/hook/climax 等所有面向观众的字段一律用该语种,不得混写;判断不出时用中文。
只输出合法 JSON,不要解释、不要 markdown 代码块。`;

export interface ScriptInput {
  topic: string;
  style: string;
  lang: string;
  // Exact segment count specified by the user (optional); if not provided, left entirely to AI to decide by story pacing (4-6 segments).
  targetSegments?: number;
}

export interface DramaCharacter {
  key: string;
  name: string;
  persona: string;
  appearance: string; // English, used to generate costume reference photos
}
export interface DramaSegment {
  i: number;
  durationSec: number; // AI decides, 4-15
  cast: string[]; // appearing character keys
  product?: boolean; // whether the product appears in this shot's frame (AI labels for shopping themes; used to lock consistency when product image is uploaded)
  scene: string;
  action: string;
  dialogue?: string;
  hook?: string;
}
export interface DramaScript {
  title: string;
  logline: string;
  sellingPoints: string[];
  characters: DramaCharacter[];
  setting: string;
  sceneImagePrompt: string; // English, used to generate scene image
  productImagePrompt: string; // English, used to generate "product costume reference photo" (empty string if no physical product)
  segments: DramaSegment[];
  climax: string;
}

function extractJson(raw: string): Record<string, unknown> {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  if (a < 0) throw new Error('no_json_in_llm_output');
  const b = s.lastIndexOf('}');
  if (b > a) {
    try { return JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>; } catch { /* may be truncated, attempt fallback repair below */ }
  }
  // Fallback for output truncated by max_tokens: cut to the last position that looks complete, then try appending closing brackets to preserve as much generated content as possible.
  const frag = s.slice(a);
  const cut = Math.max(frag.lastIndexOf('"}'), frag.lastIndexOf('}]'), frag.lastIndexOf('}'));
  if (cut > 0) {
    const head = frag.slice(0, cut + 1);
    for (const tail of ['', '}', ']}', '}]}', '"}]}', '"}]} ']) {
      try { return JSON.parse(head + tail) as Record<string, unknown>; } catch { /* try next tail */ }    }
  }
  throw new Error('llm_json_unparseable');
}

const KEY_ALPHA = 'abcdefghijklmnopqrstuvwxyz';
function clampInt(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
}
function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

// Normalize the LLM's raw JSON into a DramaScript that both frontend and backend can safely consume:
// Characters get key/appearance filled in, each segment's durationSec is clamped, cast is filtered to valid keys (fallback if empty).
// Try not to throw — preserving generated content so it can still produce video is more important than strict validation.
export function normalizeScript(j: Record<string, unknown>): DramaScript {
  const rawChars = Array.isArray(j.characters) ? j.characters : [];
  const characters: DramaCharacter[] = rawChars.slice(0, 4).map((c, idx): DramaCharacter => {
    const o = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
    const name = asStr(o.name, `角色${idx + 1}`);
    const persona = asStr(o.persona, '');
    return {
      key: asStr(o.key, `char_${KEY_ALPHA[idx] || idx}`),
      name,
      persona,
      // appearance fallback uses persona when missing (at least gives the image model some info), avoiding completely random costume reference photos.
      appearance: asStr(o.appearance, persona || `A distinctive character named ${name}, photorealistic, cinematic.`),
    };
  });
  const keySet = new Set(characters.map((c) => c.key));
  const fallbackCast = characters.slice(0, 2).map((c) => c.key); // when no cast, at least use the first two characters as reference

  const rawSegs = Array.isArray(j.segments) ? j.segments : [];
  const segments: DramaSegment[] = rawSegs.slice(0, 8).map((s, idx): DramaSegment => {
    const o = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
    const cast = (Array.isArray(o.cast) ? o.cast : [])
      .map((k) => asStr(k))
      .filter((k) => keySet.has(k));
    return {
      i: clampInt(o.i, 1, 99, idx + 1),
      durationSec: clampInt(o.durationSec ?? o.dur, 4, 15, 8),
      cast: cast.length ? cast : fallbackCast,
      product: o.product === true,
      scene: asStr(o.scene),
      action: asStr(o.action),
      dialogue: asStr(o.dialogue) || undefined,
      hook: asStr(o.hook) || undefined,
    };
  });

  const sellingPoints = (Array.isArray(j.sellingPoints) ? j.sellingPoints : [])
    .map((x) => asStr(x))
    .filter(Boolean)
    .slice(0, 5);

  return {
    title: asStr(j.title, '未命名剧本'),
    logline: asStr(j.logline),
    sellingPoints,
    characters,
    setting: asStr(j.setting),
    sceneImagePrompt: asStr(j.sceneImagePrompt, asStr(j.setting)),
    productImagePrompt: asStr(j.productImagePrompt),
    segments,
    climax: asStr(j.climax),
  };
}

export async function draftScript(input: ScriptInput): Promise<DramaScript> {
  const style = DRAMA_STYLES.find((s) => s.id === input.style) || DRAMA_STYLES[0];
  const segHint = input.targetSegments
    ? `分镜数量:必须严格产出 exactly ${input.targetSegments} 段分镜(segments 数组长度正好 ${input.targetSegments}),不多不少。`
    : `分镜数量:由你按剧情节奏决定,4-6 段为宜(至少 4 段,除非剧情极短)。`;
  const usr = `产出 1 个【${style.label}】风格的剧情长剧本。
主题/产品:${input.topic}
风格要点:${style.hint}
**输出语言(极重要):先判断上面【主题/产品】这段文字用的是什么语言,然后整个剧本所有面向观众的文本字段 —— title、logline、setting、sellingPoints、每段的 scene / action / dialogue / hook、climax —— 全部用与它相同的语言书写(用户用中文写就通篇中文、用英文写就通篇英文、用日文写就通篇日文,以此类推,不是只有台词!);判断不出时用中文。characters 的 appearance 字段例外,始终用英文(供出图模型)。**${segHint}
严格用这个 JSON 结构(只输出 JSON):
{
  "title": "标题",
  "logline": "一句话故事",
  "sellingPoints": ["若有产品给1-3条卖点;纯剧情给主题看点"],
  "characters": [
    {"key": "char_a", "name": "原创角色名", "persona": "人设/为什么反差好看(与主题同语种)", "appearance": "ENGLISH ≥40-word full-body reference: age, gender, hairstyle, outfit materials & colors, body type, signature props, facial features, expression, lighting — detailed enough for a consistent, recognizable look. Characters must look clearly different from each other."}
  ],
  "setting": "场景一句话(与主题同语种,给用户看)",
  "sceneImagePrompt": "ENGLISH cinematic establishing shot of the setting, no people, detailed environment, lighting and mood.",
  "productImagePrompt": "ENGLISH clean studio packshot of the exact product from the topic (category, packaging form, main colors, Chinese brand text on the pack), plain background. Empty string if no physical product.",
  "segments": [
    {"i": 1, "durationSec": 6, "cast": ["char_a"], "product": true, "scene": "画面/景别/构图(与主题同语种)", "action": "这一段的剧情与动作(与主题同语种)", "dialogue": "台词(可空,与主题同语种)", "hook": "笑点/反转/看点"}
  ],
  "climax": "爆点:为什么好看/会传播"
}
注意:①characters 2-3 个(最多4),每个的 key 用 char_a/char_b/char_c;②每段 cast 里的 key 必须是上面 characters 定义过的;③durationSec 是整数秒(4-12),按节奏定,别所有段都一样;④按上面要求的段数产出,别少给;⑤带货主题:productImagePrompt 必填且产品出镜段标 product:true(至少一半段落),全剧同一件产品;纯剧情:productImagePrompt 给空字符串、所有段 false;⑥所有字符串值里禁止出现英文双引号字符,台词一律用中文引号「」(否则 JSON 会坏、分镜会丢)。`;
  // Quality-first primary model; on occasional 502/timeout (Atlas gateway fluctuation), degrade to faster and more stable gemini fallback.
  // Sum of two timeouts < Worker 120s: primary ~68s (tested 53s is enough) + fallback 44s = 112s.
  const attempts = [
    { model: DRAMA_SCRIPT_MODEL, timeout: Math.min(SCRIPT_TIMEOUT_MS, 58_000) },
    { model: DRAMA_SCRIPT_FALLBACK_MODEL, timeout: 50_000 },
  ];
  let lastErr: unknown;
  for (const { model, timeout } of attempts) {
    try {
      const raw = await atlasChat(
        [{ role: 'system', content: SYS }, { role: 'user', content: usr }],
        model,
        SCRIPT_MAX_TOKENS, // rich schema (per-character appearance + multiple segments) is long, but must leave Worker recovery time.
        timeout,
      );
      return normalizeScript(extractJson(raw));
    } catch (e) {
      lastErr = e;
      console.error(`[draftScript] model ${model} failed: ${String(e)}`);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('script_failed');
}
