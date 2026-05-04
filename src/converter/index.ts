import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import sharp from "sharp";
import type {
  CodexPetManifest,
  OpenCodePetManifest,
  ConvertOptions,
  PetListEntry,
} from "../types.js";
import { CONVERTER_VERSION, PETS_DIR } from "../types.js";
import { parseSpritesheet, detectGrid } from "./spritesheet.js";
import { frameToTerminal, type ColorMode } from "./terminal-art.js";

export async function convert(options: ConvertOptions): Promise<OpenCodePetManifest> {
  const inputDir = options.input;
  const petJsonPath = join(inputDir, "pet.json");

  if (!existsSync(petJsonPath)) {
    throw new Error(`No pet.json found in ${inputDir}. Is this a Codex pet directory?`);
  }

  const rawManifest = JSON.parse(readFileSync(petJsonPath, "utf-8")) as CodexPetManifest;

  if (!rawManifest.id || !rawManifest.displayName) {
    throw new Error("Invalid pet.json: missing id or displayName");
  }

  const spritesheetPath = join(inputDir, rawManifest.spritesheetPath || "spritesheet.webp");
  if (!existsSync(spritesheetPath)) {
    throw new Error(`Spritesheet not found: ${spritesheetPath}`);
  }

  const petId = options.name || rawManifest.id;
  const outputDir = options.output.startsWith("~/") || options.output.startsWith("$HOME/")
    ? join(homedir(), options.output.replace(/^~\/|^\$HOME\//, ""), petId)
    : join(options.output, petId);

  if (existsSync(outputDir) && !options.force) {
    throw new Error(
      `Pet "${petId}" already exists at ${outputDir}. Use --force to overwrite.`,
    );
  }

  // Detect spritesheet grid
  const metadata = await sharp(spritesheetPath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read spritesheet dimensions");
  }

  const grid = detectGrid(
    metadata.width,
    metadata.height,
    options.cols,
    options.rows,
    options.frameWidth,
    options.frameHeight,
  );

  console.log(
    `Spritesheet: ${metadata.width}x${metadata.height}, grid: ${grid.cols}x${grid.rows}, ` +
      `frame: ${grid.frameWidth}x${grid.frameHeight}, total: ${grid.cols * grid.rows} frames`,
  );

  // Parse frames
  const { frames } = await parseSpritesheet(spritesheetPath, grid.cols, grid.rows);

  // Convert to terminal art
  const outputWidth = options.outputWidth || 40;
  const outputHeight = options.outputHeight || 20;
  const colorMode = options.colorMode || "truecolor";

  console.log(
    `Converting ${frames.length} frames to ${outputWidth}x${outputHeight} ` +
      `terminal art (${colorMode} color)...`,
  );

  const terminalFrames: string[][] = [];
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]!;
    const lines = frameToTerminal(frame, outputWidth, outputHeight, colorMode, true);
    terminalFrames.push(lines);
    if ((i + 1) % 10 === 0 || i === frames.length - 1) {
      process.stdout.write(`\r  Frame ${i + 1}/${frames.length}`);
    }
  }
  console.log("");

  // Write output
  const manifest: OpenCodePetManifest = {
    id: petId,
    displayName: rawManifest.displayName,
    description: rawManifest.description || "",
    source: "codex",
    originalPath: inputDir,
    frames: terminalFrames,
    frameCount: terminalFrames.length,
    cols: grid.cols,
    rows: grid.rows,
    convertedAt: new Date().toISOString(),
    converterVersion: CONVERTER_VERSION,
  };

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, "pet.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );

  console.log(`\nConverted ${petId} → ${outputDir}`);
  console.log(`  Frames: ${manifest.frameCount}`);
  console.log(`  Size: ${outputWidth}x${outputHeight} characters (${outputWidth * 2}x${outputHeight} virtual pixels)`);

  return manifest;
}

export function listPets(baseDir?: string): PetListEntry[] {
  const dir = baseDir || join(homedir(), PETS_DIR);
  if (!existsSync(dir)) return [];

  const entries: PetListEntry[] = [];

  for (const entry of readdirSync(dir)) {
    const petDir = join(dir, entry);
    if (!statSync(petDir).isDirectory()) continue;

    const manifestPath = join(petDir, "pet.json");
    if (!existsSync(manifestPath)) continue;

    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as OpenCodePetManifest;
      entries.push({
        id: manifest.id,
        displayName: manifest.displayName,
        description: manifest.description,
        frameCount: manifest.frameCount,
        path: petDir,
      });
    } catch {
      continue;
    }
  }

  return entries;
}
