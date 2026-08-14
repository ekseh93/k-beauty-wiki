import { isContentStatus, validateContentWrite, validateForPublish, type ContentRecord } from "../backend/shared/content.ts";

export interface DraftValidationResult {
  status: ContentRecord["status"] | "draft";
  errors: string[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateDraft(value: unknown): DraftValidationResult {
  if (!isObject(value)) return { status: "draft", errors: ["content must be a JSON object"] };

  const content = value as Partial<ContentRecord>;
  const requestedStatus = content.status ?? "draft";
  const status = isContentStatus(requestedStatus) ? requestedStatus : "draft";
  const errors = validateContentWrite(content);
  if (!content.status) errors.push("status is required; use draft, review, or published");

  if (status === "review") {
    if (content.isFixture === true) errors.push("fixture content cannot enter the review workflow");
    if (!content.titleJa?.trim()) errors.push("titleJa is required for review");
    if (!content.koreanName?.trim()) errors.push("koreanName is required for review");
    if (!content.slug?.trim()) errors.push("slug is required for review");
    if (!content.summary?.trim()) errors.push("summary is required for review");
    if (!content.body?.length) errors.push("body is required for review");
    if (!content.sources?.length) errors.push("at least one source is required for review");
    if (!content.lastVerifiedAt?.trim()) errors.push("lastVerifiedAt is required for review");
  }

  if (status === "published") errors.push(...validateForPublish(content));
  return { status, errors: [...new Set(errors)] };
}
