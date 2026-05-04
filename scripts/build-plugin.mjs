#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transformAsync } from "@babel/core";
import solid from "babel-preset-solid";
import ts from "@babel/preset-typescript";
import * as esbuild from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const srcDir = join(repoRoot, "src", "plugin");
const outDir = join(repoRoot, "dist", "plugin");

const targets = [
  { in: "index.tsx", out: "index.js" },
  { in: "pet-loader.ts", out: "pet-loader.js" },
];

mkdirSync(outDir, { recursive: true });

// --- Step 1: Compile TypeScript + Solid JSX with Babel ---
for (const { in: inFile, out: outFile } of targets) {
  const inPath = join(srcDir, inFile);
  const outPath = join(outDir, outFile);
  const code = readFileSync(inPath, "utf-8");

  const result = await transformAsync(code, {
    filename: inPath,
    configFile: false,
    babelrc: false,
    sourceMaps: "inline",
    presets: [
      [solid, { generate: "universal", moduleName: "@opentui/solid" }],
      [ts, { isTSX: inFile.endsWith(".tsx"), allExtensions: true }],
    ],
  });

  if (!result?.code) throw new Error(`Failed to compile ${inFile}`);
  writeFileSync(outPath, result.code, "utf-8");
  console.log(`compiled ${inFile} -> ${outFile} (${result.code.length} bytes)`);
}

// --- Step 2: Bundle with esbuild for self-contained global install ---
// Bundles solid-js, @opentui/solid and transitive deps into one file
// so the plugin works when installed globally (no peer-dep resolution needed).
const bundleEntry = join(outDir, "index.js");
const bundled = await esbuild.build({
  entryPoints: [bundleEntry],
  bundle: true,
  format: "esm",
  platform: "node",
  external: ["node:*", "@opentui/core", "@opentui/core/*"],
  outfile: bundleEntry,
  write: true,
  allowOverwrite: true,
});

if (bundled.errors.length > 0) {
  console.error("esbuild bundle errors:", bundled.errors);
  process.exit(1);
}
if (bundled.warnings.length > 0) {
  console.warn("esbuild bundle warnings:", bundled.warnings);
}

// Read bundled size
const bundledCode = readFileSync(bundleEntry, "utf-8");
console.log(`bundled plugin -> index.js (${bundledCode.length} bytes)`);
