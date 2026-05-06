// promote-v4.mjs — DEPRECATED.
//
// This script's job (copying v4 mockup files to root with URL transformations)
// has been folded into scripts/build-bilingual.mjs, which now sources from v4
// directly. Both `node scripts/build-bilingual.mjs` and the existing
// `npm run build:bilingual` (in portal/package.json predeploy chain) produce
// the same output as this script used to.
//
// Kept as a thin wrapper for backwards compatibility with old commit messages
// and shell history. Safe to delete.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, "build-bilingual.mjs");

console.log("[promote-v4] forwarding to build-bilingual.mjs (this script is deprecated)\n");
const result = spawnSync(process.execPath, [target], { stdio: "inherit" });
process.exit(result.status || 0);
