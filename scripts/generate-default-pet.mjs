#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generatePet } from "../dist/converter/generator.js";
import { CONVERTER_VERSION } from "../dist/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "assets", "default-pet.json");

const template = {
  body: "blob",
  colors: "teal",
  features: 1,
  animation: "bounce",
  name: "opencode-pet:default",
};

const frames = generatePet(template, 30, 16, "truecolor");

const manifest = {
  id: "opencode-pet-default",
  displayName: "Tide Blobby",
  description: "Default companion bundled with opencode-pet.",
  source: "codex",
  frames,
  frameCount: frames.length,
  cols: 0,
  rows: 0,
  convertedAt: new Date().toISOString(),
  converterVersion: CONVERTER_VERSION,
};

writeFileSync(outPath, JSON.stringify(manifest), "utf-8");
console.log(`Wrote ${frames.length}-frame default pet to ${outPath}`);
