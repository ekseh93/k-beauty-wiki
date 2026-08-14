import { readFile } from "node:fs/promises";
import { validateDraft } from "./content-draft";

function readOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument?.slice(prefix.length) || undefined;
}

async function main(): Promise<void> {
  const file = readOption("file");
  if (!file) throw new Error("--file=path/to/content.json is required");

  let value: unknown;
  try {
    value = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`Could not read or parse ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const result = validateDraft(value);
  console.log(JSON.stringify({ file, status: result.status, ready: result.errors.length === 0, errors: result.errors }, null, 2));
  if (result.errors.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

