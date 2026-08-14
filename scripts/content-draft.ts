import { isContentStatus, validateContentWrite, validateForPublish, validateForReview, type ContentRecord } from "../backend/shared/content.ts";

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

  if (status === "review") errors.push(...validateForReview(content));

  if (status === "published") errors.push(...validateForPublish(content));
  return { status, errors: [...new Set(errors)] };
}
