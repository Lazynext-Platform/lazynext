/**
 * Creative Compliance Checker.
 *
 * Platform policy compliance checking for TikTok, YouTube, Meta, and Google ads.
 * Performs rule-based detection (keyword matching against COMPLIANCE_RULES) first,
 * then uses atlasChat for deeper semantic analysis (claim verification, contextual
 * issues). Results are combined into a single ComplianceResult.
 *
 * Credit cost: COMPLIANCE_COST (4 credits).
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

// ── Types ──

export type CompliancePlatform = 'tiktok' | 'youtube' | 'meta' | 'google' | 'universal';
export type ComplianceSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ComplianceCategory =
  | 'prohibited_content'
  | 'restricted_content'
  | 'claim_verification'
  | 'brand_safety'
  | 'platform_policy'
  | 'disclosure'
  | 'copyright'
  | 'accessibility'
  | 'data_privacy';
export type ComplianceStatus = 'compliant' | 'warning' | 'violation' | 'needs_review';

export interface ComplianceRule {
  ruleId: string;
  platform: CompliancePlatform;
  category: ComplianceCategory;
  title: string;
  description: string;
  severity: ComplianceSeverity;
  keywords: string[];
  recommendation: string;
}

export interface ComplianceViolation {
  ruleId: string;
  platform: CompliancePlatform;
  category: ComplianceCategory;
  severity: ComplianceSeverity;
  title: string;
  description: string;
  matchedContent: string;
  recommendation: string;
  line?: number;
}

export interface ComplianceCheckRequest {
  content: string;
  platforms: CompliancePlatform[];
  contentType?: 'video_script' | 'image_text' | 'caption' | 'landing_page' | 'ad_copy';
  brandName?: string;
  productClaims?: string[];
  targetAudience?: string;
}

export interface ComplianceResult {
  overallStatus: ComplianceStatus;
  complianceScore: number;
  platforms: Array<{
    platform: CompliancePlatform;
    status: ComplianceStatus;
    violations: ComplianceViolation[];
    warnings: ComplianceViolation[];
    score: number;
  }>;
  violations: ComplianceViolation[];
  warnings: ComplianceViolation[];
  claimVerification: Array<{
    claim: string;
    status: 'verified' | 'unverified' | 'misleading' | 'needs_evidence';
    recommendation: string;
  }>;
  brandSafetyScore: number;
  brandSafetyFlags: string[];
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    affectedPlatforms: CompliancePlatform[];
  }>;
  checkedAt: string;
}

export const COMPLIANCE_COST = 4;

// ── Severity weights for scoring ──
const SEVERITY_WEIGHT: Record<ComplianceSeverity, number> = {
  critical: 35,
  high: 20,
  medium: 10,
  low: 5,
  info: 1,
};

const ALL_PLATFORMS: CompliancePlatform[] = ['tiktok', 'youtube', 'meta', 'google', 'universal'];

const PLATFORM_INFO: Array<{ platform: CompliancePlatform; name: string; policyUrl: string }> = [
  { platform: 'tiktok', name: 'TikTok', policyUrl: 'https://www.tiktok.com/business/en/ads-policies' },
  { platform: 'youtube', name: 'YouTube', policyUrl: 'https://support.google.com/adspolicy/answer/6008942' },
  { platform: 'meta', name: 'Meta (Facebook/Instagram)', policyUrl: 'https://www.facebook.com/policies/ads' },
  { platform: 'google', name: 'Google Ads', policyUrl: 'https://support.google.com/adspolicy/answer/6008942' },
  { platform: 'universal', name: 'Universal (All Platforms)', policyUrl: 'https://www.ftc.gov/business-guidance/advertising-marketing' },
];

// ── Compliance rules (30+ across platforms and categories) ──

export const COMPLIANCE_RULES: ComplianceRule[] = [
  // ── Prohibited content (universal) ──
  {
    ruleId: 'PROH-001',
    platform: 'universal',
    category: 'prohibited_content',
    title: 'Illegal products and services',
    description: 'Ads promoting illegal products, services, or activities are prohibited on all platforms.',
    severity: 'critical',
    keywords: ['illegal', 'black market', 'counterfeit', 'stolen goods', 'illegal drugs', 'contraband', 'smuggling'],
    recommendation: 'Remove all references to illegal products or services immediately.',
  },
  {
    ruleId: 'PROH-002',
    platform: 'universal',
    category: 'prohibited_content',
    title: 'Weapons and firearms',
    description: 'Advertising weapons, firearms, ammunition, or explosives is prohibited.',
    severity: 'critical',
    keywords: ['gun', 'firearm', 'ammunition', 'rifle', 'pistol', 'handgun', 'explosive', 'weapon', 'knives for sale', 'switchblade'],
    recommendation: 'Remove all weapon and firearm references. These products cannot be advertised.',
  },
  {
    ruleId: 'PROH-003',
    platform: 'universal',
    category: 'prohibited_content',
    title: 'Recreational drugs and controlled substances',
    description: 'Ads for recreational drugs, controlled substances, or drug paraphernalia are prohibited.',
    severity: 'critical',
    keywords: ['cocaine', 'heroin', 'meth', 'weed for sale', 'marijuana for sale', 'cannabis dispensary', 'bong', 'pipe shop', 'drug paraphernalia', 'ecstasy'],
    recommendation: 'Remove all references to recreational drugs and controlled substances.',
  },
  {
    ruleId: 'PROH-004',
    platform: 'universal',
    category: 'prohibited_content',
    title: 'Adult content and pornography',
    description: 'Explicit adult content, pornography, and sexual services are prohibited in advertising.',
    severity: 'critical',
    keywords: ['porn', 'pornography', 'xxx', 'adult content', 'escort service', 'sexual content', 'nude', 'explicit sex'],
    recommendation: 'Remove all explicit adult content references.',
  },
  {
    ruleId: 'PROH-005',
    platform: 'universal',
    category: 'prohibited_content',
    title: 'Hate speech and discrimination',
    description: 'Content that promotes hate, discrimination, or violence against protected groups is prohibited.',
    severity: 'critical',
    keywords: ['hate speech', 'racial slur', 'discrimination', 'supremacist', 'xenophobic', 'homophobic slur', 'antisemitic', 'sexist slur'],
    recommendation: 'Remove all hate speech and discriminatory language immediately.',
  },
  {
    ruleId: 'PROH-006',
    platform: 'universal',
    category: 'prohibited_content',
    title: 'Tobacco and related products',
    description: 'Advertising tobacco products, e-cigarettes, and vaping products is restricted or prohibited.',
    severity: 'high',
    keywords: ['cigarette', 'tobacco', 'vape', 'e-cigarette', 'vaping', 'chewing tobacco', 'cigar'],
    recommendation: 'Remove tobacco and vaping references; these are age-restricted or prohibited.',
  },

  // ── Restricted content ──
  {
    ruleId: 'REST-001',
    platform: 'universal',
    category: 'restricted_content',
    title: 'Alcohol advertising',
    description: 'Alcohol ads are restricted and require age-gating, responsible drinking messaging, and market-specific compliance.',
    severity: 'high',
    keywords: ['alcohol', 'beer', 'wine', 'liquor', 'spirits', 'whiskey', 'vodka', 'drinking', 'get drunk', 'booze'],
    recommendation: 'Ensure alcohol ads are age-gated and include responsible drinking disclaimers.',
  },
  {
    ruleId: 'REST-002',
    platform: 'universal',
    category: 'restricted_content',
    title: 'Gambling and betting',
    description: 'Gambling ads are restricted and require licensing verification and market-specific compliance.',
    severity: 'high',
    keywords: ['gambling', 'casino', 'bet', 'betting', 'sports betting', 'poker', 'lottery', 'jackpot', 'wager'],
    recommendation: 'Verify gambling licensing and add responsible gambling disclaimers.',
  },
  {
    ruleId: 'REST-003',
    platform: 'universal',
    category: 'restricted_content',
    title: 'Health and medical claims',
    description: 'Health claims require substantiation and may need regulatory approval. Misleading health claims are restricted.',
    severity: 'high',
    keywords: ['treatment', 'cure', 'disease', 'medical', 'prescription', 'therapy', 'diagnose', 'symptom relief', 'clinical'],
    recommendation: 'Substantiate all health claims with evidence and add required disclaimers.',
  },
  {
    ruleId: 'REST-004',
    platform: 'universal',
    category: 'restricted_content',
    title: 'Financial products and services',
    description: 'Financial product ads (loans, crypto, investments) require risk disclosures and licensing.',
    severity: 'high',
    keywords: ['loan', 'cryptocurrency', 'crypto', 'investment', 'forex', 'trading', 'get rich', 'passive income', 'bitcoin', 'nft'],
    recommendation: 'Add required risk disclosures and verify financial licensing for the target market.',
  },
  {
    ruleId: 'REST-005',
    platform: 'universal',
    category: 'restricted_content',
    title: 'Political advertising',
    description: 'Political ads require disclosure of sponsor, identity verification, and compliance with election laws.',
    severity: 'high',
    keywords: ['vote', 'election', 'candidate', 'political party', 'ballot', 'campaign', 'politician', 'political action committee'],
    recommendation: 'Add required political ad disclaimers and complete identity verification.',
  },
  {
    ruleId: 'REST-006',
    platform: 'universal',
    category: 'restricted_content',
    title: 'Weight loss and body image',
    description: 'Weight loss claims are restricted and must avoid unrealistic expectations and body shaming.',
    severity: 'medium',
    keywords: ['lose weight', 'weight loss', 'fat burn', 'diet pill', 'slim down', 'shed pounds', 'burn fat', 'thin'],
    recommendation: 'Avoid unrealistic weight loss claims and body shaming language.',
  },

  // ── Claim verification ──
  {
    ruleId: 'CLAIM-001',
    platform: 'universal',
    category: 'claim_verification',
    title: 'Superlative claims ("best", "#1")',
    description: 'Superlative claims like "best" or "#1" require substantiation and may be considered misleading without evidence.',
    severity: 'medium',
    keywords: ['best', '#1', 'number one', 'top rated', 'world\'s best', 'the greatest', 'unmatched', 'unrivaled'],
    recommendation: 'Substantiate superlative claims with verifiable evidence or rephrase to avoid absolute claims.',
  },
  {
    ruleId: 'CLAIM-002',
    platform: 'universal',
    category: 'claim_verification',
    title: 'Guarantee claims',
    description: 'Guarantee claims require clear terms, conditions, and fulfillment mechanisms.',
    severity: 'medium',
    keywords: ['guaranteed', 'guarantee', 'money back guarantee', 'risk-free guarantee', 'lifetime guarantee'],
    recommendation: 'Define guarantee terms clearly and ensure fulfillment mechanisms are in place.',
  },
  {
    ruleId: 'CLAIM-003',
    platform: 'universal',
    category: 'claim_verification',
    title: 'Absolute claims ("cures", "100%")',
    description: 'Absolute claims such as "cures" or "100%" are high-risk and require rigorous substantiation.',
    severity: 'high',
    keywords: ['cures', '100%', '100 percent', 'never fails', 'always works', 'zero risk', 'foolproof', 'miracle cure'],
    recommendation: 'Avoid absolute claims. Use qualified language and provide substantiation evidence.',
  },
  {
    ruleId: 'CLAIM-004',
    platform: 'universal',
    category: 'claim_verification',
    title: '"Free" offers with conditions',
    description: '"Free" offers must clearly disclose any conditions, shipping costs, or subscription requirements.',
    severity: 'medium',
    keywords: ['free', 'free trial', 'free gift', 'no cost', 'complimentary', 'free shipping'],
    recommendation: 'Disclose all conditions, shipping costs, and subscription requirements for "free" offers.',
  },
  {
    ruleId: 'CLAIM-005',
    platform: 'universal',
    category: 'claim_verification',
    title: 'Before/after and result claims',
    description: 'Before/after comparisons and result claims require typicality disclosures and substantiation.',
    severity: 'medium',
    keywords: ['before and after', 'results in', 'transform your', 'instant results', 'overnight results', 'guaranteed results'],
    recommendation: 'Add typicality disclosures ("results not typical") and substantiate result claims.',
  },

  // ── Brand safety ──
  {
    ruleId: 'SAFE-001',
    platform: 'universal',
    category: 'brand_safety',
    title: 'Controversial topics',
    description: 'Content touching on controversial social or political topics may harm brand safety.',
    severity: 'medium',
    keywords: ['controversial', 'debate', 'polarizing', 'divisive', 'hot button', 'contentious'],
    recommendation: 'Avoid controversial topics that may alienate audiences or harm brand reputation.',
  },
  {
    ruleId: 'SAFE-002',
    platform: 'universal',
    category: 'brand_safety',
    title: 'Sensitive events and tragedies',
    description: 'Referencing sensitive events, tragedies, or disasters for promotional purposes is brand-unsafe.',
    severity: 'high',
    keywords: ['tragedy', 'disaster', 'terrorist', 'mass shooting', 'war', 'crisis', 'catastrophe', 'casualty'],
    recommendation: 'Remove references to sensitive events and tragedies used for promotion.',
  },
  {
    ruleId: 'SAFE-003',
    platform: 'universal',
    category: 'brand_safety',
    title: 'Profanity and offensive language',
    description: 'Profanity and offensive language reduce brand safety and may violate platform guidelines.',
    severity: 'medium',
    keywords: ['damn', 'hell', 'crap', 'ass', 'bastard', 'bloody', 'bugger'],
    recommendation: 'Remove profanity and offensive language to maintain brand safety.',
  },
  {
    ruleId: 'SAFE-004',
    platform: 'universal',
    category: 'brand_safety',
    title: 'Violence and graphic content',
    description: 'Violent or graphic content is brand-unsafe and may be prohibited by platforms.',
    severity: 'high',
    keywords: ['violent', 'graphic', 'gory', 'blood', 'kill', 'murder', 'brutal', 'slaughter'],
    recommendation: 'Remove violent and graphic content references.',
  },

  // ── Platform-specific policies ──
  {
    ruleId: 'PLAT-TT-001',
    platform: 'tiktok',
    category: 'platform_policy',
    title: 'TikTok music licensing',
    description: 'TikTok requires proper music licensing. Using unlicensed copyrighted music is prohibited.',
    severity: 'high',
    keywords: ['copyrighted music', 'unlicensed song', 'popular song', 'chart hit', 'royalty-free without license', 'soundtrack'],
    recommendation: 'Use only licensed or TikTok-provided commercial music library tracks.',
  },
  {
    ruleId: 'PLAT-TT-002',
    platform: 'tiktok',
    category: 'platform_policy',
    title: 'TikTok duet and stitch restrictions',
    description: 'TikTok has restrictions on duet/stitch content and requires creator consent.',
    severity: 'low',
    keywords: ['duet', 'stitch', 'react to', 'remix without permission'],
    recommendation: 'Ensure you have creator consent for duet/stitch content.',
  },
  {
    ruleId: 'PLAT-YT-001',
    platform: 'youtube',
    category: 'platform_policy',
    title: 'YouTube clickbait and spam',
    description: 'YouTube prohibits clickbait titles, misleading thumbnails, and spammy repetition.',
    severity: 'medium',
    keywords: ['clickbait', 'you won\'t believe', 'shocking truth', 'must watch', 'spam', 'click here', 'subscribe now or'],
    recommendation: 'Avoid clickbait titles and misleading thumbnails. Use accurate descriptions.',
  },
  {
    ruleId: 'PLAT-YT-002',
    platform: 'youtube',
    category: 'platform_policy',
    title: 'YouTube spam and deceptive practices',
    description: 'YouTube prohibits deceptive practices, fake engagement, and spam links.',
    severity: 'high',
    keywords: ['fake engagement', 'buy subscribers', 'bot views', 'spam link', 'phishing', 'scam link'],
    recommendation: 'Remove deceptive practices and spam links. Build engagement organically.',
  },
  {
    ruleId: 'PLAT-META-001',
    platform: 'meta',
    category: 'platform_policy',
    title: 'Meta personal attributes targeting',
    description: 'Meta prohibits ads that assert or imply personal attributes (race, religion, sexual orientation, etc.).',
    severity: 'high',
    keywords: ['are you gay', 'are you black', 'are you muslim', 'are you pregnant', 'do you have', 'if you\'re a woman', 'if you\'re disabled'],
    recommendation: 'Rephrase to avoid asserting or implying personal attributes of the viewer.',
  },
  {
    ruleId: 'PLAT-META-002',
    platform: 'meta',
    category: 'platform_policy',
    title: 'Meta misleading claims',
    description: 'Meta prohibits misleading or deceptive claims, including false urgency and bait-and-switch.',
    severity: 'high',
    keywords: ['limited time only', 'last chance', 'act now', 'only today', 'ending soon', 'bait and switch', 'fake discount'],
    recommendation: 'Ensure all claims are accurate and avoid false urgency or bait-and-switch tactics.',
  },
  {
    ruleId: 'PLAT-GOOGLE-001',
    platform: 'google',
    category: 'platform_policy',
    title: 'Google trademark usage',
    description: 'Google restricts the use of trademarks in ad text without authorization from the trademark owner.',
    severity: 'high',
    keywords: ['trademark', 'registered trademark', '™', '®', 'brand name misuse', 'competitor trademark'],
    recommendation: 'Obtain trademark authorization or remove trademarked terms from ad text.',
  },
  {
    ruleId: 'PLAT-GOOGLE-002',
    platform: 'google',
    category: 'platform_policy',
    title: 'Google bridge page and low-value content',
    description: 'Google prohibits bridge pages that redirect with no original content and low-value affiliate pages.',
    severity: 'medium',
    keywords: ['bridge page', 'redirect page', 'thin content', 'affiliate landing', 'mirror site', 'doorway page'],
    recommendation: 'Provide original, valuable content on landing pages. Avoid bridge and doorway pages.',
  },

  // ── Disclosure ──
  {
    ruleId: 'DISC-001',
    platform: 'universal',
    category: 'disclosure',
    title: 'Sponsored content disclosure',
    description: 'Sponsored or paid content must be clearly disclosed per FTC guidelines and platform policies.',
    severity: 'high',
    keywords: ['sponsored', 'paid partnership', 'ad', 'advertisement', 'promoted', 'brand partnership', 'in collaboration with'],
    recommendation: 'Add clear sponsorship disclosure (e.g., #ad, #sponsored) prominently in the content.',
  },
  {
    ruleId: 'DISC-002',
    platform: 'universal',
    category: 'disclosure',
    title: 'Affiliate link disclosure',
    description: 'Affiliate links must be disclosed clearly to comply with FTC guidelines.',
    severity: 'medium',
    keywords: ['affiliate link', 'affiliate', 'commission', 'referral link', 'i earn a commission', 'as an affiliate'],
    recommendation: 'Add a clear affiliate disclosure stating you may earn commissions from links.',
  },
  {
    ruleId: 'DISC-003',
    platform: 'universal',
    category: 'disclosure',
    title: 'Paid partnership label',
    description: 'Paid partnerships must use platform-native paid partnership labels where available.',
    severity: 'low',
    keywords: ['paid partnership', 'branded content', 'paid promotion', 'sponsored post'],
    recommendation: 'Use the platform-native paid partnership label for branded content.',
  },

  // ── Copyright ──
  {
    ruleId: 'COPY-001',
    platform: 'universal',
    category: 'copyright',
    title: 'Copyrighted music usage',
    description: 'Using copyrighted music without a license is prohibited and risks takedowns.',
    severity: 'high',
    keywords: ['copyrighted music', 'licensed track', 'popular song', 'hit song', 'chart-topper', 'royalty-free without license'],
    recommendation: 'Use licensed music or royalty-free tracks with proper licensing.',
  },
  {
    ruleId: 'COPY-002',
    platform: 'universal',
    category: 'copyright',
    title: 'Trademarked terms',
    description: 'Using trademarked terms without authorization may infringe on trademark rights.',
    severity: 'medium',
    keywords: ['trademark', '™', '®', 'registered', 'brand name', 'logo misuse'],
    recommendation: 'Obtain authorization to use trademarked terms or remove them.',
  },
  {
    ruleId: 'COPY-003',
    platform: 'universal',
    category: 'copyright',
    title: 'Copyrighted images and footage',
    description: 'Using copyrighted images or footage without permission is prohibited.',
    severity: 'high',
    keywords: ['stock photo without license', 'copyrighted image', 'footage without permission', 'screenshot of movie', 'tv clip'],
    recommendation: 'Use properly licensed images and footage with appropriate permissions.',
  },

  // ── Accessibility ──
  {
    ruleId: 'ACC-001',
    platform: 'universal',
    category: 'accessibility',
    title: 'Captions and subtitles',
    description: 'Video content should include captions/subtitles for accessibility compliance.',
    severity: 'low',
    keywords: ['no captions', 'no subtitles', 'audio only', 'without captions'],
    recommendation: 'Add captions or subtitles to all video content for accessibility.',
  },
  {
    ruleId: 'ACC-002',
    platform: 'universal',
    category: 'accessibility',
    title: 'Alt text for images',
    description: 'Images should include descriptive alt text for screen reader accessibility.',
    severity: 'low',
    keywords: ['image without alt text', 'no alt text', 'decorative image'],
    recommendation: 'Add descriptive alt text to all meaningful images.',
  },

  // ── Data privacy ──
  {
    ruleId: 'PRIV-001',
    platform: 'universal',
    category: 'data_privacy',
    title: 'PII collection',
    description: 'Collecting personally identifiable information requires privacy policy disclosure and consent.',
    severity: 'high',
    keywords: ['email address', 'phone number', 'social security', 'home address', 'date of birth', 'credit card', 'passport'],
    recommendation: 'Add a privacy policy disclosure and obtain explicit consent for PII collection.',
  },
  {
    ruleId: 'PRIV-002',
    platform: 'universal',
    category: 'data_privacy',
    title: 'Tracking pixels and cookies',
    description: 'Tracking pixels and cookies require cookie consent disclosure per GDPR/CCPA.',
    severity: 'medium',
    keywords: ['tracking pixel', 'cookies', 'facebook pixel', 'google analytics', 'retargeting pixel', 'tracking cookies'],
    recommendation: 'Add cookie consent disclosure and comply with GDPR/CCPA requirements.',
  },
  {
    ruleId: 'PRIV-003',
    platform: 'universal',
    category: 'data_privacy',
    title: 'Data sharing with third parties',
    description: 'Sharing user data with third parties requires explicit disclosure and consent.',
    severity: 'medium',
    keywords: ['share your data', 'sell your data', 'third party', 'data broker', 'data partner'],
    recommendation: 'Disclose data sharing practices and obtain explicit user consent.',
  },
];

// ── Helpers ──

const COMPLIANCE_MODEL = process.env.COMPLIANCE_MODEL || getLLMModel();
const COMPLIANCE_TIMEOUT_MS = Number(process.env.COMPLIANCE_TIMEOUT_MS || 60_000);
const COMPLIANCE_MAX_TOKENS = Number(process.env.COMPLIANCE_MAX_TOKENS || 4000);

function resolveComplianceModel(planTier?: PlanTier): string {
  if (process.env.COMPLIANCE_MODEL) return process.env.COMPLIANCE_MODEL;
  return getLLMModel(planTier);
}

function extractJson(raw: string): Record<string, unknown> {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) return {};
  try {
    return JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function asStrArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => asStr(x)).filter(Boolean).slice(0, 50) : [];
}

function asNum(v: unknown, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

// ── Rule-based detection ──

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect violations and warnings via keyword matching against COMPLIANCE_RULES.
 * Rules with severity critical/high are treated as violations; medium/low/info as warnings.
 */
export function detectViolations(
  content: string,
  platforms: CompliancePlatform[],
  customRules: ComplianceRule[] = [],
): { violations: ComplianceViolation[]; warnings: ComplianceViolation[] } {
  const violations: ComplianceViolation[] = [];
  const warnings: ComplianceViolation[] = [];
  const lower = content.toLowerCase();
  const lines = content.split('\n');

  // Always include universal rules plus any explicitly requested platforms.
  const targetPlatforms = new Set<CompliancePlatform>(platforms);
  targetPlatforms.add('universal');

  // Merge built-in and custom rules
  const allRules = [...COMPLIANCE_RULES, ...customRules];

  for (const rule of allRules) {
    if (!targetPlatforms.has(rule.platform)) continue;

    for (const kw of rule.keywords) {
      const pattern = new RegExp(escapeRegex(kw.toLowerCase()), 'gi');
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(lower)) !== null) {
        const matched = m[0];
        // Find the line number of the match.
        const upTo = m.index;
        let line = 1;
        let count = 0;
        for (let i = 0; i < lines.length; i++) {
          const len = lines[i].length + 1; // +1 for newline
          if (count + len > upTo) {
            line = i + 1;
            break;
          }
          count += len;
        }

        const v: ComplianceViolation = {
          ruleId: rule.ruleId,
          platform: rule.platform,
          category: rule.category,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          matchedContent: matched,
          recommendation: rule.recommendation,
          line,
        };

        if (rule.severity === 'critical' || rule.severity === 'high') {
          violations.push(v);
        } else {
          warnings.push(v);
        }
        break; // one match per keyword per rule is enough
      }
    }
  }

  // De-duplicate violations by ruleId+matchedContent.
  const dedup = (arr: ComplianceViolation[]): ComplianceViolation[] => {
    const seen = new Set<string>();
    return arr.filter((v) => {
      const key = `${v.ruleId}:${v.matchedContent}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return { violations: dedup(violations), warnings: dedup(warnings) };
}

// ── Claim verification ──

/**
 * Verify product claims. Uses rule-based heuristics first, then atlasChat for
 * deeper semantic verification when claims are provided.
 */
export function verifyClaims(
  claims: string[],
  content: string,
): ComplianceResult['claimVerification'] {
  if (!claims.length) return [];

  // Rule-based heuristic: detect high-risk claim language.
  const highRiskPatterns = ['cures', '100%', 'guaranteed', 'miracle', 'instant', 'overnight', 'never fails', 'foolproof'];
  const superlativePatterns = ['best', '#1', 'number one', 'top rated', 'world\'s best'];
  const absolutePatterns = ['always', 'never', 'everyone', 'all', 'completely', 'perfectly'];

  const results: ComplianceResult['claimVerification'] = claims.map((claim) => {
    const lower = claim.toLowerCase();
    if (highRiskPatterns.some((p) => lower.includes(p))) {
      return {
        claim,
        status: 'misleading',
        recommendation: 'This claim uses absolute or cure-all language that is likely misleading. Remove or substantiate with rigorous evidence.',
      };
    }
    if (superlativePatterns.some((p) => lower.includes(p))) {
      return {
        claim,
        status: 'needs_evidence',
        recommendation: 'Superlative claims require verifiable evidence (e.g., awards, rankings). Add substantiation or rephrase.',
      };
    }
    if (absolutePatterns.some((p) => lower.includes(p))) {
      return {
        claim,
        status: 'needs_evidence',
        recommendation: 'Absolute claims require evidence. Consider qualified language (e.g., "many", "most").',
      };
    }
    // If the claim appears in the content, mark as unverified pending evidence.
    if (content.toLowerCase().includes(lower)) {
      return {
        claim,
        status: 'unverified',
        recommendation: 'Claim is present in content but not verified. Add supporting evidence or citations.',
      };
    }
    return {
      claim,
      status: 'unverified',
      recommendation: 'Claim cannot be verified against the provided content. Add supporting evidence.',
    };
  });

  return results;
}

// ── Brand safety scoring ──

/**
 * Calculate brand safety score (0-100, 100 = safest) and flags.
 */
export function calculateBrandSafety(
  content: string,
  violations: ComplianceViolation[],
): { score: number; flags: string[] } {
  const flags = new Set<string>();
  let penalty = 0;

  for (const v of violations) {
    if (v.category === 'brand_safety') {
      flags.add(v.title);
      penalty += SEVERITY_WEIGHT[v.severity];
    }
    if (v.category === 'prohibited_content') {
      flags.add(`Prohibited content: ${v.title}`);
      penalty += SEVERITY_WEIGHT[v.severity];
    }
  }

  // Content-level heuristics for brand safety.
  const lower = content.toLowerCase();
  const sensitiveTerms = ['violence', 'death', 'kill', 'blood', 'tragedy', 'disaster', 'crisis', 'controversial'];
  for (const term of sensitiveTerms) {
    if (lower.includes(term)) {
      flags.add(`Sensitive term detected: ${term}`);
      penalty += 3;
    }
  }

  const score = Math.max(0, Math.min(100, 100 - penalty));
  return { score, flags: Array.from(flags) };
}

// ── Scoring helpers ──

function scoreFromViolations(
  violations: ComplianceViolation[],
  warnings: ComplianceViolation[],
): number {
  let penalty = 0;
  for (const v of violations) penalty += SEVERITY_WEIGHT[v.severity];
  for (const w of warnings) penalty += Math.round(SEVERITY_WEIGHT[w.severity] / 2);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function statusFromScore(score: number): ComplianceStatus {
  if (score >= 90) return 'compliant';
  if (score >= 70) return 'warning';
  if (score >= 50) return 'needs_review';
  return 'violation';
}

function statusFromViolations(
  violations: ComplianceViolation[],
  warnings: ComplianceViolation[],
): ComplianceStatus {
  const hasCritical = violations.some((v) => v.severity === 'critical');
  if (hasCritical) return 'violation';
  const hasHigh = violations.some((v) => v.severity === 'high');
  if (hasHigh) return 'needs_review';
  if (violations.length > 0 || warnings.length > 2) return 'warning';
  if (warnings.length > 0) return 'warning';
  return 'compliant';
}

// ── Platform info / rules accessors ──

export function getComplianceRules(platform?: CompliancePlatform): ComplianceRule[] {
  if (!platform) return COMPLIANCE_RULES;
  return COMPLIANCE_RULES.filter((r) => r.platform === platform);
}

/** Convert a CustomComplianceRule DB record to a ComplianceRule. */
export function dbRuleToComplianceRule(db: {
  platform: string;
  category: string;
  title: string;
  description: string;
  keywordsJson: string;
  recommendation: string;
  severity: string;
  ruleId?: string;
  id: string;
}): ComplianceRule {
  return {
    ruleId: `custom:${db.id}`,
    platform: db.platform as CompliancePlatform,
    category: db.category as ComplianceCategory,
    title: db.title,
    description: db.description,
    keywords: JSON.parse(db.keywordsJson || '[]'),
    recommendation: db.recommendation,
    severity: db.severity as ComplianceSeverity,
  };
}

export function getCompliancePlatforms(): Array<{ platform: CompliancePlatform; name: string; policyUrl: string }> {
  return PLATFORM_INFO;
}

// ── Request validation ──

export function validateComplianceRequest(
  request: ComplianceCheckRequest,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request.content || typeof request.content !== 'string' || !request.content.trim()) {
    errors.push('content is required');
  } else if (request.content.length > 10000) {
    errors.push('content must be at most 10000 characters');
  }
  if (!Array.isArray(request.platforms) || request.platforms.length === 0) {
    errors.push('platforms is required and must include at least one platform');
  } else {
    const valid = new Set<CompliancePlatform>(ALL_PLATFORMS);
    for (const p of request.platforms) {
      if (!valid.has(p)) {
        errors.push(`invalid platform: ${p}`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

// ── Semantic analysis via atlasChat ──

const COMPLIANCE_SYS = `You are an advertising compliance analyst. Analyze the provided ad content for platform policy compliance, claim verification, and brand safety issues across the requested platforms. Return a JSON object with fields:
- "additionalViolations": array of {ruleId (string), platform, category (one of: prohibited_content, restricted_content, claim_verification, brand_safety, platform_policy, disclosure, copyright, accessibility, data_privacy), severity (one of: critical, high, medium, low, info), title, description, matchedContent, recommendation}
- "claimVerification": array of {claim, status (one of: verified, unverified, misleading, needs_evidence), recommendation}
- "contextualIssues": array of strings describing contextual brand-safety concerns not caught by keyword matching
- "recommendations": array of {priority (high, medium, low), recommendation, affectedPlatforms (array of platform strings)}
Output ONLY the JSON.`;

interface SemanticAnalysis {
  additionalViolations: ComplianceViolation[];
  claimVerification: ComplianceResult['claimVerification'];
  contextualIssues: string[];
  recommendations: ComplianceResult['recommendations'];
}

async function semanticAnalysis(
  request: ComplianceCheckRequest,
  platforms: CompliancePlatform[],
  planTier?: PlanTier,
): Promise<SemanticAnalysis> {
  const parts: string[] = [
    `Content to check:\n${request.content.slice(0, 8000)}`,
    `Platforms: ${platforms.join(', ')}`,
  ];
  if (request.contentType) parts.push(`Content type: ${request.contentType}`);
  if (request.brandName) parts.push(`Brand: ${request.brandName}`);
  if (request.productClaims?.length) parts.push(`Product claims: ${request.productClaims.join('; ')}`);
  if (request.targetAudience) parts.push(`Target audience: ${request.targetAudience}`);
  parts.push('Output the compliance analysis JSON now.');

  const raw = await atlasChat(
    [{ role: 'system', content: COMPLIANCE_SYS }, { role: 'user', content: parts.join('\n') }],
    resolveComplianceModel(planTier),
    COMPLIANCE_MAX_TOKENS,
    COMPLIANCE_TIMEOUT_MS,
  );
  const j = extractJson(raw);

  const additionalViolations: ComplianceViolation[] = (Array.isArray(j.additionalViolations) ? j.additionalViolations : [])
    .slice(0, 20)
    .map((item, idx): ComplianceViolation => {
      const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      return {
        ruleId: asStr(o.ruleId, `semantic_${idx + 1}`),
        platform: asStr(o.platform, 'universal') as CompliancePlatform,
        category: asStr(o.category, 'platform_policy') as ComplianceCategory,
        severity: asStr(o.severity, 'medium') as ComplianceSeverity,
        title: asStr(o.title),
        description: asStr(o.description),
        matchedContent: asStr(o.matchedContent),
        recommendation: asStr(o.recommendation),
      };
    })
    .filter((v) => v.title);

  const claimVerification: ComplianceResult['claimVerification'] = (Array.isArray(j.claimVerification) ? j.claimVerification : [])
    .slice(0, 30)
    .map((item): ComplianceResult['claimVerification'][number] => {
      const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const status = asStr(o.status, 'unverified') as ComplianceResult['claimVerification'][number]['status'];
      const validStatuses = new Set(['verified', 'unverified', 'misleading', 'needs_evidence']);
      return {
        claim: asStr(o.claim),
        status: validStatuses.has(status) ? status : 'unverified',
        recommendation: asStr(o.recommendation),
      };
    })
    .filter((c) => c.claim);

  const contextualIssues: string[] = asStrArr(j.contextualIssues);

  const recommendations: ComplianceResult['recommendations'] = (Array.isArray(j.recommendations) ? j.recommendations : [])
    .slice(0, 15)
    .map((item): ComplianceResult['recommendations'][number] => {
      const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const priority = asStr(o.priority, 'medium') as 'high' | 'medium' | 'low';
      const validPriorities = new Set(['high', 'medium', 'low']);
      return {
        priority: validPriorities.has(priority) ? priority : 'medium',
        recommendation: asStr(o.recommendation),
        affectedPlatforms: asStrArr(o.affectedPlatforms).filter((p) =>
          new Set<CompliancePlatform>(ALL_PLATFORMS).has(p as CompliancePlatform),
        ) as CompliancePlatform[],
      };
    })
    .filter((r) => r.recommendation);

  return { additionalViolations, claimVerification, contextualIssues, recommendations };
}

// ── Main entry point ──

/**
 * Run a full compliance check: rule-based detection first, then semantic
 * analysis via atlasChat, then combine into a ComplianceResult.
 */
export async function checkCompliance(
  request: ComplianceCheckRequest,
  planTier?: PlanTier,
  userId?: string,
): Promise<ComplianceResult> {
  const platforms: CompliancePlatform[] = request.platforms.includes('universal')
    ? request.platforms
    : [...request.platforms, 'universal'];

  // Load custom compliance rules for this user (if provided)
  let customRules: ComplianceRule[] = [];
  if (userId) {
    try {
      const { prisma } = await import('@/lib/prisma');
      const dbRules = await prisma.customComplianceRule.findMany({
        where: { userId, enabled: true },
        orderBy: { priority: 'desc' },
      });
      customRules = dbRules.map(dbRuleToComplianceRule);
    } catch (e) {
      console.warn('[compliance] failed to load custom rules:', String(e));
    }
  }

  // 1. Rule-based detection (includes custom rules).
  const { violations: ruleViolations, warnings: ruleWarnings } = detectViolations(
    request.content,
    platforms,
    customRules,
  );

  // 2. Claim verification (rule-based heuristic first).
  const ruleClaims = request.productClaims?.length
    ? verifyClaims(request.productClaims, request.content)
    : [];

  // 3. Semantic analysis via atlasChat (best-effort; fall back to rule-based only on failure).
  let semantic: SemanticAnalysis = {
    additionalViolations: [],
    claimVerification: [],
    contextualIssues: [],
    recommendations: [],
  };
  try {
    semantic = await semanticAnalysis(request, platforms, planTier);
  } catch (e) {
    console.error('[compliance] semantic analysis failed, using rule-based only:', String(e));
  }

  // 4. Combine violations and warnings.
  const allViolations = [...ruleViolations, ...semantic.additionalViolations.filter((v) => v.severity === 'critical' || v.severity === 'high')];
  const allWarnings = [...ruleWarnings, ...semantic.additionalViolations.filter((v) => v.severity === 'medium' || v.severity === 'low' || v.severity === 'info')];

  // Merge claim verification (semantic takes precedence for claims it covers).
  const semanticClaimTexts = new Set(semantic.claimVerification.map((c) => c.claim.toLowerCase()));
  const mergedClaims = [
    ...semantic.claimVerification,
    ...ruleClaims.filter((c) => !semanticClaimTexts.has(c.claim.toLowerCase())),
  ];

  // 5. Brand safety.
  const { score: brandSafetyScore, flags: brandSafetyFlags } = calculateBrandSafety(
    request.content,
    allViolations,
  );
  // Add contextual issues to brand safety flags.
  for (const issue of semantic.contextualIssues) {
    if (!brandSafetyFlags.includes(issue)) brandSafetyFlags.push(issue);
  }

  // 6. Per-platform breakdown.
  const platformResults: ComplianceResult['platforms'] = platforms.map((platform) => {
    const pViolations = allViolations.filter((v) => v.platform === platform);
    const pWarnings = allWarnings.filter((v) => v.platform === platform);
    const score = scoreFromViolations(pViolations, pWarnings);
    const status = statusFromViolations(pViolations, pWarnings);
    return {
      platform,
      status,
      violations: pViolations,
      warnings: pWarnings,
      score,
    };
  });

  // 7. Overall score and status.
  const complianceScore = scoreFromViolations(allViolations, allWarnings);
  const overallStatus = statusFromViolations(allViolations, allWarnings);

  // 8. Recommendations (combine semantic + rule-based).
  const ruleRecommendations: ComplianceResult['recommendations'] = [];
  const affectedByCategory = (cat: ComplianceCategory): CompliancePlatform[] => {
    const set = new Set<CompliancePlatform>();
    for (const v of allViolations) if (v.category === cat) set.add(v.platform);
    for (const w of allWarnings) if (w.category === cat) set.add(w.platform);
    return Array.from(set);
  };
  if (allViolations.some((v) => v.category === 'prohibited_content')) {
    ruleRecommendations.push({
      priority: 'high',
      recommendation: 'Remove all prohibited content references before publishing.',
      affectedPlatforms: affectedByCategory('prohibited_content'),
    });
  }
  if (allViolations.some((v) => v.category === 'claim_verification') || allWarnings.some((w) => w.category === 'claim_verification')) {
    ruleRecommendations.push({
      priority: 'high',
      recommendation: 'Substantiate all claims with verifiable evidence or rephrase to avoid absolute/superlative language.',
      affectedPlatforms: affectedByCategory('claim_verification'),
    });
  }
  if (allWarnings.some((w) => w.category === 'disclosure')) {
    ruleRecommendations.push({
      priority: 'medium',
      recommendation: 'Add required sponsorship and affiliate disclosures.',
      affectedPlatforms: affectedByCategory('disclosure'),
    });
  }
  if (brandSafetyScore < 80) {
    ruleRecommendations.push({
      priority: brandSafetyScore < 50 ? 'high' : 'medium',
      recommendation: 'Address brand safety flags to improve suitability for advertising.',
      affectedPlatforms: platforms,
    });
  }

  // Merge semantic recommendations (dedupe by recommendation text).
  const recTexts = new Set(ruleRecommendations.map((r) => r.recommendation.toLowerCase()));
  for (const r of semantic.recommendations) {
    if (!recTexts.has(r.recommendation.toLowerCase())) {
      ruleRecommendations.push(r);
      recTexts.add(r.recommendation.toLowerCase());
    }
  }
  // Sort by priority.
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  ruleRecommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    overallStatus,
    complianceScore,
    platforms: platformResults,
    violations: allViolations,
    warnings: allWarnings,
    claimVerification: mergedClaims,
    brandSafetyScore,
    brandSafetyFlags,
    recommendations: ruleRecommendations,
    checkedAt: new Date().toISOString(),
  };
}
