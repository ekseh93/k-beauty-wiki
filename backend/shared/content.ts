export type ContentStatus = "draft" | "review" | "published" | "archived";

export type SourceType =
  | "official-api"
  | "written-permission"
  | "public-fact"
  | "short-quote"
  | "manual-reference"
  | "community-review"
  | "prohibited";

export type RightsStatus = "verified" | "reference-only" | "needs-review" | "rejected";

export type ExtractionMethod = "api" | "licensed-import" | "manual" | "no-automation";

export interface ContentSource {
  title: string;
  url: string;
  checkedAt: string;
  sourceType: SourceType;
  rightsStatus: RightsStatus;
  extractionMethod: ExtractionMethod;
  quote?: string;
}

export interface ReviewEvidence {
  sampleCount: number;
  independentSourceCount: number;
  collectedAt: string;
  summary: string;
  sourceUrls: string[];
}

export interface TreatmentDetails {
  kind: "treatment";
  principle: string;
  purpose: string;
  suitableFor: string[];
  consultOrAvoid: string[];
  priceRange: string;
  priceCondition: string;
  duration: string;
  downtime: string;
  maintenance: string;
  sideEffects: string[];
  similarTreatments: string[];
}

export interface ProductDetails {
  kind: "product";
  brand: string;
  productType: string;
  volume: string;
  price: string;
  currency: string;
  pricePerVolume: string;
  keyIngredients: { name: string; role: string }[];
  skinTypes: string[];
  usage: string[];
  pros: string[];
  considerations: string[];
  priceCheckedAt: string;
}

export type ContentDetails = TreatmentDetails | ProductDetails;

export interface ContentRecord {
  id: string;
  kind: "treatment" | "skincare" | "makeup";
  titleJa: string;
  koreanName: string;
  slug: string;
  summary: string;
  body: string[];
  tags: string[];
  aliases: string[];
  status: ContentStatus;
  lastVerifiedAt?: string;
  sources: ContentSource[];
  reviewEvidence?: ReviewEvidence;
  details?: ContentDetails;
  isFixture?: boolean;
  updatedAt: string;
  createdAt: string;
  relatedSlugs: string[];
}

export function validateForPublish(content: Partial<ContentRecord>): string[] {
  const errors: string[] = [];
  if (!content.titleJa?.trim()) errors.push("titleJa is required");
  if (!content.koreanName?.trim()) errors.push("koreanName is required");
  if (!content.slug?.trim()) errors.push("slug is required");
  if (!content.summary?.trim()) errors.push("summary is required");
  if (!content.body?.length) errors.push("body is required");
  if (!content.sources?.length) errors.push("at least one source is required");
  if (!content.lastVerifiedAt?.trim()) errors.push("lastVerifiedAt is required");

  if (content.isFixture === true) errors.push("fixture content cannot be published");

  if (content.lastVerifiedAt && !isDateOnly(content.lastVerifiedAt)) {
    errors.push("lastVerifiedAt must be an ISO date (YYYY-MM-DD)");
  }

  for (const [index, source] of (content.sources ?? []).entries()) {
    if (!source.title?.trim()) errors.push(`sources[${index}].title is required`);
    if (!isHttpUrl(source.url)) errors.push(`sources[${index}].url must be an http(s) URL`);
    if (!isDateOnly(source.checkedAt)) errors.push(`sources[${index}].checkedAt must be an ISO date (YYYY-MM-DD)`);
    if (!source.sourceType) errors.push(`sources[${index}].sourceType is required`);
    if (!source.rightsStatus) errors.push(`sources[${index}].rightsStatus is required`);
    if (!source.extractionMethod) errors.push(`sources[${index}].extractionMethod is required`);
    if (source.sourceType === "prohibited") errors.push(`sources[${index}] is marked prohibited`);
    if (source.rightsStatus === "needs-review" || source.rightsStatus === "rejected") {
      errors.push(`sources[${index}] does not have publishable rights status`);
    }
    if (source.sourceType === "short-quote" && !source.quote?.trim()) {
      errors.push(`sources[${index}].quote is required for short-quote sources`);
    }
    if (source.quote && source.quote.length > 500) {
      errors.push(`sources[${index}].quote must be 500 characters or fewer`);
    }
  }

  if (content.reviewEvidence) {
    const evidence = content.reviewEvidence;
    if (!Number.isInteger(evidence.sampleCount) || evidence.sampleCount < 5) {
      errors.push("reviewEvidence.sampleCount must be at least 5");
    }
    if (!Number.isInteger(evidence.independentSourceCount) || evidence.independentSourceCount < 1) {
      errors.push("reviewEvidence.independentSourceCount must be at least 1");
    }
    if (!isDateOnly(evidence.collectedAt)) errors.push("reviewEvidence.collectedAt must be an ISO date (YYYY-MM-DD)");
    if (!evidence.summary?.trim()) errors.push("reviewEvidence.summary is required");
    if (!evidence.sourceUrls?.length || evidence.sourceUrls.some((url) => !isHttpUrl(url))) {
      errors.push("reviewEvidence.sourceUrls must contain http(s) URLs");
    }
  }

  if (content.kind === "treatment") {
    const details = content.details;
    if (!details || details.kind !== "treatment") {
      errors.push("details for treatment content are required");
    } else {
      const requiredFields: (keyof TreatmentDetails)[] = ["principle", "purpose", "priceRange", "priceCondition", "duration", "downtime", "maintenance"];
      for (const field of requiredFields) {
        if (typeof details[field] !== "string" || !details[field].trim()) errors.push(`details.${field} is required`);
      }
      if (!details.suitableFor?.length) errors.push("details.suitableFor is required");
      if (!details.consultOrAvoid?.length) errors.push("details.consultOrAvoid is required");
      if (!details.sideEffects?.length) errors.push("details.sideEffects is required");
      if (!details.similarTreatments?.length) errors.push("details.similarTreatments is required");
    }
  }

  if (content.kind === "skincare" || content.kind === "makeup") {
    const details = content.details;
    if (!details || details.kind !== "product") {
      errors.push("details for product content are required");
    } else {
      const requiredFields: (keyof ProductDetails)[] = ["brand", "productType", "volume", "price", "currency", "pricePerVolume", "priceCheckedAt"];
      for (const field of requiredFields) {
        if (typeof details[field] !== "string" || !details[field].trim()) errors.push(`details.${field} is required`);
      }
      if (!isDateOnly(details.priceCheckedAt)) errors.push("details.priceCheckedAt must be an ISO date (YYYY-MM-DD)");
      if (!details.keyIngredients?.length) errors.push("details.keyIngredients is required");
      if (!details.skinTypes?.length) errors.push("details.skinTypes is required");
      if (!details.usage?.length) errors.push("details.usage is required");
      if (!details.pros?.length) errors.push("details.pros is required");
      if (!details.considerations?.length) errors.push("details.considerations is required");
    }
  }

  return errors;
}

function isHttpUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isDateOnly(value: string | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function corsHeaders() {
  return {
    "access-control-allow-origin": process.env.ALLOWED_ORIGIN ?? "*",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  };
}

export function jsonResponse(statusCode: number, payload: unknown) {
  return { statusCode, headers: { ...corsHeaders(), "content-type": "application/json" }, body: JSON.stringify(payload) };
}
