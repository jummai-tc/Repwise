/**
 * Runs every .mts suite in this folder. Each is a plain script that exits
 * non-zero on failure, so there is no test framework to keep up to date.
 */
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const suites = readdirSync(here).filter((f) => f.endsWith(".mts") && f !== "live.mts").sort();

let failed = 0;
for (const suite of suites) {
  const { status } = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      "--import", join(here, "register.mjs"),
      join(here, suite),
    ],
    { stdio: "inherit" },
  );
  if (status !== 0) failed++;
}

process.exit(failed === 0 ? 0 : 1);
