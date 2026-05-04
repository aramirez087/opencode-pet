#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { findSprite, spriteToManifest } from "../dist/converter/sprites.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "assets", "default-pet.json");

const sprite = findSprite("mochi-cat");
if (!sprite) {
  console.error("Could not find sprite 'mochi-cat' in the curated library.");
  process.exit(1);
}

const manifest = spriteToManifest(sprite);
manifest.id = "opencode-pet-default";
manifest.displayName = "Mochi (default)";
manifest.description = "Default companion bundled with opencode-pet.";

writeFileSync(outPath, JSON.stringify(manifest), "utf-8");
console.log(`Wrote ${manifest.frameCount}-frame default pet to ${outPath}`);
