export type ContentStatus = "draft" | "review" | "published" | "archived";

const contentStatuses: ContentStatus[] = ["draft", "review", "published", "archived"];
const contentKinds: ContentRecord["kind"][] = ["treatment", "skincare", "makeup"];

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

const sourceTypes: SourceType[] = ["official-api", "written-permission", "public-fact", "short-quote", "manual-reference", "community-review", "prohibited"];
const rightsStatuses: RightsStatus[] = ["verified", "reference-only", "needs-review", "rejected"];
const extractionMethods: ExtractionMethod[] = ["api", "licensed-import", "manual", "no-automation"];

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
  platform: string;
  sampleCount: number;
  independentSourceCount: number;
  reviewCountAtCollection: number;
  reviewWindow: string;
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

export function isContentStatus(value: unknown): value is ContentStatus {
  return typeof value === "string" && contentStatuses.includes(value as ContentStatus);
}

export function isContentKind(value: unknown): value is ContentRecord["kind"] {
  return typeof value === "string" && contentKinds.includes(value as ContentRecord["kind"]);
}

export function isSourceType(value: unknown): value is SourceType {
  return typeof value === "string" && sourceTypes.includes(value as SourceType);
}

export function isRightsStatus(value: unknown): value is RightsStatus {
  return typeof value === "string" && rightsStatuses.includes(value as RightsStatus);
}

export function isExtractionMethod(value: unknown): value is ExtractionMethod {
  return typeof value === "string" && extractionMethods.includes(value as ExtractionMethod);
}

export function validateContentWrite(content: Partial<ContentRecord>): string[] {
  const errors: string[] = [];
  if (content.status !== undefined && !isContentStatus(content.status)) {
    errors.push("status must be one of draft, review, published, archived");
  }
  if (content.kind !== undefined && !isContentKind(content.kind)) {
    errors.push("kind must be one of treatment, skincare, makeup");
  }
  if (content.sources !== undefined && !Array.isArray(content.sources)) {
    errors.push("sources must be an array");
  }
  if (Array.isArray(content.sources) && content.sources.some((source) => !source || typeof source !== "object" || Array.isArray(source))) {
    errors.push("sources entries must be objects");
  }
  if (content.relatedSlugs !== undefined && !Array.isArray(content.relatedSlugs)) {
    errors.push("relatedSlugs must be an array");
  }
  return errors;
}

export function validateForReview(content: Partial<ContentRecord>): string[] {
  const errors: string[] = [];
  if (!isContentKind(content.kind)) errors.push("kind is required and must be one of treatment, skincare, makeup");
  if (!isNonEmptyString(content.titleJa)) errors.push("titleJa is required");
  if (!isNonEmptyString(content.koreanName)) errors.push("koreanName is required");
  if (!isNonEmptyString(content.slug)) errors.push("slug is required");
  if (!isNonEmptyString(content.summary)) errors.push("summary is required");
  if (!content.body?.length) errors.push("body is required");
  if (!Array.isArray(content.sources)) {
    errors.push("sources must be an array");
  } else if (!content.sources.length) {
    errors.push("at least one source is required");
  }
  if (!isNonEmptyString(content.lastVerifiedAt)) errors.push("lastVerifiedAt is required");

  if (content.isFixture === true) errors.push("fixture content cannot enter the review workflow");

  if (content.lastVerifiedAt && !isDateOnly(content.lastVerifiedAt)) {
    errors.push("lastVerifiedAt must be an ISO date (YYYY-MM-DD)");
  }

  for (const [index, source] of (Array.isArray(content.sources) ? content.sources : []).entries()) {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      errors.push(`sources[${index}] must be an object`);
      continue;
    }
    const candidate = source as Partial<ContentSource>;
    if (!isNonEmptyString(candidate.title)) errors.push(`sources[${index}].title is required`);
    if (!isHttpUrl(candidate.url)) errors.push(`sources[${index}].url must be an http(s) URL`);
    if (!isDateOnly(candidate.checkedAt)) errors.push(`sources[${index}].checkedAt must be an ISO date (YYYY-MM-DD)`);
    if (!isSourceType(candidate.sourceType)) errors.push(`sources[${index}].sourceType must be a supported value`);
    if (!isRightsStatus(candidate.rightsStatus)) errors.push(`sources[${index}].rightsStatus must be a supported value`);
    if (!isExtractionMethod(candidate.extractionMethod)) errors.push(`sources[${index}].extractionMethod must be a supported value`);
    if (candidate.sourceType === "prohibited") errors.push(`sources[${index}] is marked prohibited`);
    if (candidate.sourceType === "short-quote" && !isNonEmptyString(candidate.quote)) {
      errors.push(`sources[${index}].quote is required for short-quote sources`);
    }
    if (candidate.quote !== undefined && typeof candidate.quote !== "string") {
      errors.push(`sources[${index}].quote must be a string`);
    } else if (candidate.quote && candidate.quote.length > 500) {
      errors.push(`sources[${index}].quote must be 500 characters or fewer`);
    }
  }

  const sources = Array.isArray(content.sources) ? content.sources : [];
  const hasCommunityReviewSource = sources.some((source) => source && typeof source === "object" && !Array.isArray(source) && (source as Partial<ContentSource>).sourceType === "community-review");
  if (hasCommunityReviewSource && !content.reviewEvidence) {
    errors.push("reviewEvidence is required when a community-review source is included");
  }
  if (content.reviewEvidence !== undefined) {
    errors.push(...validateReviewEvidence(content.reviewEvidence));
    errors.push(...validateReviewEvidenceSourceLinks(content.reviewEvidence, sources));
  }

  return errors;
}

export function validateForPublish(content: Partial<ContentRecord>): string[] {
  const errors = validateForReview(content).map((error) => error === "fixture content cannot enter the review workflow" ? "fixture content cannot be published" : error);

  const sources = Array.isArray(content.sources) ? content.sources : [];
  for (const [index, source] of sources.entries()) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    if (source.rightsStatus === "needs-review" || source.rightsStatus === "rejected") {
      errors.push(`sources[${index}] does not have publishable rights status`);
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

function validateReviewEvidence(evidence: unknown): string[] {
  const errors: string[] = [];
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return ["reviewEvidence must be an object"];
  }
  const candidate = evidence as Partial<ReviewEvidence>;
  if (!isNonEmptyString(candidate.platform)) errors.push("reviewEvidence.platform is required");
  if (!Number.isInteger(candidate.sampleCount) || candidate.sampleCount < 5) {
    errors.push("reviewEvidence.sampleCount must be at least 5");
  }
  if (!Number.isInteger(candidate.independentSourceCount) || candidate.independentSourceCount < 1) {
    errors.push("reviewEvidence.independentSourceCount must be at least 1");
  }
  if (!Number.isInteger(candidate.reviewCountAtCollection) || candidate.reviewCountAtCollection < (candidate.sampleCount ?? 5)) {
    errors.push("reviewEvidence.reviewCountAtCollection must be at least sampleCount");
  }
  if (!isNonEmptyString(candidate.reviewWindow)) errors.push("reviewEvidence.reviewWindow is required");
  if (!isDateOnly(candidate.collectedAt)) errors.push("reviewEvidence.collectedAt must be an ISO date (YYYY-MM-DD)");
  if (!isNonEmptyString(candidate.summary)) errors.push("reviewEvidence.summary is required");
  if (!Array.isArray(candidate.sourceUrls) || !candidate.sourceUrls.length || candidate.sourceUrls.some((url) => !isHttpUrl(url))) {
    errors.push("reviewEvidence.sourceUrls must contain http(s) URLs");
  }
  if (Array.isArray(candidate.sourceUrls) && new Set(candidate.sourceUrls).size !== candidate.sourceUrls.length) {
    errors.push("reviewEvidence.sourceUrls must not contain duplicates");
  }
  return errors;
}

function validateReviewEvidenceSourceLinks(evidence: unknown, sources: unknown[]): string[] {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return [];
  const evidenceSourceUrls = (evidence as Partial<ReviewEvidence>).sourceUrls;
  if (!Array.isArray(evidenceSourceUrls)) return [];
  const sourceUrls = new Set(sources
    .filter((source): source is ContentSource => Boolean(source) && typeof source === "object" && !Array.isArray(source))
    .map((source) => source.url));
  return evidenceSourceUrls
    .filter((url) => !sourceUrls.has(url))
    .map((url) => `reviewEvidence.sourceUrls must also be listed in sources: ${url}`);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (!value?.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isDateOnly(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
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
