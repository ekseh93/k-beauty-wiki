export type ContentStatus = "draft" | "review" | "published" | "archived";

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
  sources: { title: string; url: string; checkedAt: string }[];
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
  return errors;
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
