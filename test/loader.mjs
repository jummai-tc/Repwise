/**
 * Test-only module resolver: maps the "@/" tsconfig alias to the project root
 * and fills in the ".ts" extension that Node's ESM resolver requires but the
 * source (bundled by Next) omits.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = process.env.PROJECT_ROOT ?? process.cwd();

export function resolve(specifier, context, next) {
  let spec = specifier;

  if (spec.startsWith("@/")) {
    spec = pathToFileURL(`${ROOT}/${spec.slice(2)}`).href;
  }

  // Extensionless relative/aliased specifier -> try .ts, then /index.ts
  if (spec.startsWith(".") || spec.startsWith("file:")) {
    const base = spec.startsWith(".")
      ? new URL(spec, context.parentURL).href
      : spec;
    if (!/\.[a-z]+$/.test(base)) {
      for (const cand of [`${base}.ts`, `${base}/index.ts`]) {
        if (existsSync(fileURLToPath(cand))) return next(cand, context);
      }
    }
    return next(base, context);
  }

  return next(spec, context);
}
