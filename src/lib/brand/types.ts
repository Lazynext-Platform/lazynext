/**
 * Brand intelligence types.
 *
 * BrandProfile is the normalized, stored representation of brand knowledge.
 * BrandExtraction is the raw output from URL analysis (before normalization).
 * ProductExtraction is structured product facts from a product page.
 */

/** Raw extraction from a brand/homepage URL (before normalization). */
export interface BrandExtraction {
  company: string;
  domain: string;
  industry: string;
  positioning: string; // one-line brand positioning
  audience: string; // target audience description
  slogan: string;
  products: Array<{
    name: string;
    description: string;
    priceRange?: string;
    keyFeatures: string[];
  }>;
  features: string[]; // brand-level features
  benefits: string[]; // brand-level benefits
  claims: string[]; // marketing claims
  proofPoints: string[]; // evidence backing claims
  colors: string[]; // brand colors (hex or named)
  fonts: string[];
  visualStyle: string; // description of visual identity
  tone: string; // brand voice/tone description
  prohibitedClaims: string[]; // claims to avoid
  brandVocabulary: string[]; // preferred words/phrases
  sourceUrls: string[];
  evidenceSnippets: string[]; // text snippets that support claims
  extractionTimestamp: string;
}

/** Raw extraction from a product page URL. */
export interface ProductExtraction {
  productName: string;
  productUrl: string;
  category: string;
  price: string;
  description: string;
  benefits: string[];
  painPoints: string[];
  proofPoints: string[];
  features: string[];
  offer: string;
  images: string[]; // product image URLs found on the page
  brandName: string;
  sourceUrl: string;
  extractionTimestamp: string;
}

/** Normalized brand profile for storage in the database. */
export interface BrandProfile {
  id: string;
  userId: string;
  company: string;
  domain: string;
  industry: string;
  positioning: string;
  audience: string;
  slogan: string;
  products: Array<{
    name: string;
    description: string;
    priceRange?: string;
    keyFeatures: string[];
  }>;
  features: string[];
  benefits: string[];
  claims: string[];
  proofPoints: string[];
  colors: string[];
  fonts: string[];
  visualStyle: string;
  tone: string;
  prohibitedClaims: string[];
  brandVocabulary: string[];
  sourceUrls: string[];
  evidenceSnippets: string[];
  extractionTimestamp: string;
  createdAt: string;
  updatedAt: string;
}
