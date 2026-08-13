import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const filename = fileURLToPath(import.meta.url);
const directory = dirname(filename);
const compat = new FlatCompat({ baseDirectory: directory });

const eslintConfig = [
  { ignores: [".next/**", "cdk.out/**", "node_modules/**", "coverage/**", "playwright-report/**"] },
  ...compat.extends("next/core-web-vitals"),
];

export default eslintConfig;
