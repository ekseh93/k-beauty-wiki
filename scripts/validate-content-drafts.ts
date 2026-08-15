import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateDraft } from "./content-draft.ts";

const researchDirectory = resolve(process.cwd(), "docs/research");

async function main(): Promise<void> {
  const files = (await readdir(researchDirectory))
    .filter((file) => file.endsWith(".review.json"))
    .sort();

  if (files.length === 0) {
    throw new Error("No content review drafts found in docs/research");
  }

  let hasErrors = false;
  for (const file of files) {
    const path = resolve(researchDirectory, file);
    let value: unknown;
    try {
      value = JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
      hasErrors = true;
      console.error(`${file}: could not read or parse JSON: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    const result = validateDraft(value);
    const output = { file: `docs/research/${file}`, status: result.status, ready: result.errors.length === 0, errors: result.errors };
    console.log(JSON.stringify(output));
    if (result.errors.length > 0) hasErrors = true;
  }

  if (hasErrors) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
