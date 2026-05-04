#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transformAsync } from "@babel/core";
import solid from "babel-preset-solid";
import ts from "@babel/preset-typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const srcDir = join(repoRoot, "src", "plugin");
const outDir = join(repoRoot, "dist", "plugin");

const targets = [
  { in: "index.tsx", out: "index.js" },
  { in: "pet-loader.ts", out: "pet-loader.js" },
];

mkdirSync(outDir, { recursive: true });

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
