import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateDraft } from "./content-draft.ts";
import { validateForPublish, type ContentRecord, type RightsStatus } from "../backend/shared/content.ts";

const researchDirectory = resolve(process.cwd(), "docs/research");

export interface EditorialCandidateAudit {
  file: string;
  status: ContentRecord["status"] | "draft";
  structurallyReady: boolean;
  automatedPublishChecksPassed: boolean;
  manualApprovalRequired: boolean;
  publicPublicationAllowed: boolean;
  sourceCount: number;
  rightsStatus: Record<RightsStatus, number>;
  blockingReasons: string[];
}

function emptyRightsStatus(): Record<RightsStatus, number> {
  return { verified: 0, "reference-only": 0, "needs-review": 0, rejected: 0 };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function auditEditorialCandidate(value: unknown, file: string): EditorialCandidateAudit {
  const draftResult = validateDraft(value);
  const content = isObject(value) ? value as Partial<ContentRecord> : {};
  const sources = Array.isArray(content.sources) ? content.sources : [];
  const rightsStatus = emptyRightsStatus();

  for (const source of sources) {
    if (!isObject(source)) continue;
    const status = source.rightsStatus;
    if (status === "verified" || status === "reference-only" || status === "needs-review" || status === "rejected") {
      rightsStatus[status] += 1;
    }
  }

  const publishErrors = validateForPublish({
    ...content,
    status: "published",
    publicationApproval: { confirmed: true, note: "자동 필드 감사용 가상 승인" },
  });
  const blockingReasons = [...new Set([...draftResult.errors, ...publishErrors])];
  const automatedPublishChecksPassed = blockingReasons.length === 0;
  return {
    file,
    status: draftResult.status,
    structurallyReady: draftResult.errors.length === 0,
    automatedPublishChecksPassed,
    manualApprovalRequired: draftResult.status === "review",
    publicPublicationAllowed: draftResult.status === "published" && automatedPublishChecksPassed,
    sourceCount: sources.length,
    rightsStatus,
    blockingReasons,
  };
}

async function main(): Promise<void> {
  const files = (await readdir(researchDirectory))
    .filter((file) => file.endsWith(".review.json"))
    .sort();

  if (files.length === 0) throw new Error("No content review drafts found in docs/research");

  let hasReadError = false;
  const audits: EditorialCandidateAudit[] = [];
  for (const file of files) {
    try {
      const value = JSON.parse(await readFile(resolve(researchDirectory, file), "utf8")) as unknown;
      const audit = auditEditorialCandidate(value, `docs/research/${file}`);
      audits.push(audit);
      console.log(JSON.stringify(audit));
    } catch (error) {
      hasReadError = true;
      console.error(`${file}: could not read or parse JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const summary = {
    total: audits.length,
    structurallyReady: audits.filter((audit) => audit.structurallyReady).length,
    automatedPublishChecksPassed: audits.filter((audit) => audit.automatedPublishChecksPassed).length,
    manualApprovalRequired: audits.filter((audit) => audit.manualApprovalRequired).length,
    publicPublicationAllowed: audits.filter((audit) => audit.publicPublicationAllowed).length,
    blockedByAutomatedChecks: audits.filter((audit) => !audit.automatedPublishChecksPassed).length,
  };
  console.log(JSON.stringify({ summary }));
  if (hasReadError) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("audit-editorial-candidates.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
