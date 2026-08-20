export const DEFAULT_MAX_AGE_DAYS = 180;

export type ContentFreshnessStatus = "not-applicable" | "fresh" | "missing" | "invalid" | "stale";

export interface ContentFreshness {
  status: ContentFreshnessStatus;
  maxAgeDays: number;
  lastVerifiedAt?: string;
}

function parseDateOnly(value: unknown): Date | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : date;
}

function normalizedAgeDays(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : DEFAULT_MAX_AGE_DAYS;
}

export function getContentFreshness(item: Record<string, unknown>, asOf = new Date(), maxAgeDays = DEFAULT_MAX_AGE_DAYS): ContentFreshness {
  const ageDays = normalizedAgeDays(maxAgeDays);
  if (item.status !== "published") return { status: "not-applicable", maxAgeDays: ageDays };

  const lastVerifiedAt = typeof item.lastVerifiedAt === "string" ? item.lastVerifiedAt : undefined;
  if (!lastVerifiedAt) return { status: "missing", maxAgeDays: ageDays };
  const verifiedAt = parseDateOnly(lastVerifiedAt);
  if (!verifiedAt) return { status: "invalid", maxAgeDays: ageDays, lastVerifiedAt };

  const asOfDate = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
  const cutoff = new Date(asOfDate.getTime() - ageDays * 24 * 60 * 60 * 1000);
  return { status: verifiedAt < cutoff ? "stale" : "fresh", maxAgeDays: ageDays, lastVerifiedAt };
}

export function findStalePublishedContent(items: Record<string, unknown>[], asOf = new Date(), maxAgeDays = DEFAULT_MAX_AGE_DAYS): string[] {
  return items
    .filter((item) => {
      const status = getContentFreshness(item, asOf, maxAgeDays).status;
      return status === "missing" || status === "invalid" || status === "stale";
    })
    .map((item) => item.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}
