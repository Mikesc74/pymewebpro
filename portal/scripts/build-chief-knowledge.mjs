#!/usr/bin/env node
// ============================================================================
// build-chief-knowledge.mjs
// ----------------------------------------------------------------------------
// Reconstruye portal/src/chief-of-staff-knowledge.js a partir de:
//   - pymewebpro/CLAUDE.md
//   - pymewebpro/memory/glossary.md
//   - pymewebpro/memory/context/studio.md
//   - pymewebpro/memory/context/brand.md
//   - pymewebpro/memory/context/pipeline.md
//
// Uso:
//   node portal/scripts/build-chief-knowledge.mjs
//
// Ejecuta esto cada vez que actualices la memoria. Después corre `npm run
// deploy` para que el Chief of Staff vea los cambios.
// ============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");

// Two tiers para mantener el system prompt corto y caer dentro del ITPM:
//   CORE  -> siempre en el system prompt (CLAUDE.md + glossary, ~22KB)
//   EXTRA -> servidos bajo demanda vía tool read_doc(name)
const CORE_FILES = [
  { label: "CLAUDE.md (hot cache · master)", path: "CLAUDE.md" },
  { label: "memory/glossary.md",             path: "memory/glossary.md" },
];

const EXTRA_DOCS = {
  "studio":   { label: "memory/context/studio.md",   path: "memory/context/studio.md" },
  "brand":    { label: "memory/context/brand.md",    path: "memory/context/brand.md" },
  "pipeline": { label: "memory/context/pipeline.md", path: "memory/context/pipeline.md" },
};

let core = "";
for (const f of CORE_FILES) {
  const body = readFileSync(resolve(repoRoot, f.path), "utf8");
  core += "\n\n===== " + f.label + " =====\n\n" + body;
}

const extras = {};
for (const [key, f] of Object.entries(EXTRA_DOCS)) {
  extras[key] = readFileSync(resolve(repoRoot, f.path), "utf8");
}

const out = `// ============================================================================
// Chief of Staff · base de conocimiento
// ============================================================================
// Auto-generado desde:
//   CORE (siempre en el system prompt):
//     pymewebpro/CLAUDE.md
//     pymewebpro/memory/glossary.md
//   EXTRA (lazy via read_doc tool):
//     pymewebpro/memory/context/studio.md
//     pymewebpro/memory/context/brand.md
//     pymewebpro/memory/context/pipeline.md
//
// Regenera con: node portal/scripts/build-chief-knowledge.mjs
// NO editar a mano.
// ----------------------------------------------------------------------------

export const CHIEF_KNOWLEDGE_BASE = ${JSON.stringify(core)};

export const CHIEF_EXTRA_DOCS = ${JSON.stringify(extras, null, 2)};
`;

const outPath = resolve(repoRoot, "portal/src/chief-of-staff-knowledge.js");
writeFileSync(outPath, out);
console.log(`wrote ${out.length} bytes → ${outPath}`);
