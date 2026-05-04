#!/usr/bin/env node
import { existsSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ConvertOptions, ColorMode } from "../types.js";
import { CONVERTER_VERSION, PETS_DIR } from "../types.js";
import { convert, listPets } from "../converter/index.js";
import { generatePet, generatePetName, type PetTemplate } from "../converter/generator.js";
import { mkdirSync, writeFileSync } from "node:fs";
import type { OpenCodePetManifest } from "../types.js";
import { CONVERTER_VERSION as CV } from "../types.js";

function printHelp(): void {
  console.log(`opencode-pet v${CV} — Codex pets for OpenCode

Usage:
  opencode-pet convert <codex-pet-dir> [options]   Convert a Codex pet
  opencode-pet generate [options]                   Generate a new procedural pet
  opencode-pet list [options]                       List installed pets
  opencode-pet remove <pet-id>                      Remove an installed pet
  opencode-pet preview <pet-id>                     Preview a pet in the terminal

Convert options:
  --output, -o <dir>     Output directory (default: ~/.opencode/pets)
  --cols <n>             Grid columns in spritesheet (auto-detected if omitted)
  --rows <n>             Grid rows in spritesheet (auto-detected if omitted)
  --frame-width <px>     Frame width in pixels (alternative to --cols/--rows)
  --frame-height <px>    Frame height in pixels
  --output-width <n>     Terminal output width in characters (default: 40)
  --output-height <n>    Terminal output height in characters (default: 20)
  --color, -c <mode>     Color mode: truecolor|256|ansi16|mono (default: truecolor)
  --name <id>            Override pet id (default: from pet.json)
  --force, -f            Overwrite existing pet
  --help, -h             Show this help

Generate options:
  --type <kind>          Body type: blob|cat|ghost|robot|bunny|random (default: random)
  --colors <scheme>      Color palette: green|blue|pink|purple|orange|teal|random (default: random)
  --features <n>         Number of accessories (0-2, default: 1)
  --animation <style>    Animation: bounce|wave|blink|wiggle|random (default: random)
  --output-width <n>     Width in characters (default: 30)
  --output-height <n>    Height in characters (default: 16)
  --color, -c <mode>     Color mode: truecolor|256|ansi16|mono (default: truecolor)
  --output, -o <dir>     Output directory (default: ~/.opencode/pets)
  --force, -f            Overwrite existing pet
  --name <id>            Custom pet name

List options:
  --path <dir>           Pets directory (default: ~/.opencode/pets)

Examples:
  opencode-pet convert ~/.codex/pets/green-desk-buddy
  opencode-pet generate
  opencode-pet generate --type cat --colors pink
  opencode-pet generate --type ghost --animation blink --features 2
  opencode-pet list
  opencode-pet remove green-desk-buddy
  opencode-pet preview green-desk-buddy
`);
}

interface ParsedArgs {
  command: string;
  positional: string[];
  options: Record<string, string | boolean>;
}

function parseArgs(raw: string[]): ParsedArgs {
  const command = raw[0] || "";
  const positional: string[] = [];
  const options: Record<string, string | boolean> = {};
  let i = 1;

  while (i < raw.length) {
    const arg = raw[i]!;

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg.startsWith("--") || arg.startsWith("-")) {
      // Handle --key=value and -k value
      const eqIdx = arg.indexOf("=");
      if (eqIdx > 0) {
        const key = arg.slice(0, eqIdx).replace(/^--?/, "");
        const val = arg.slice(eqIdx + 1);
        options[key] = val;
        i++;
      } else {
        const key = arg.replace(/^--?/, "");
        const next = raw[i + 1];
        if (next && !next.startsWith("-")) {
          options[key] = next;
          i += 2;
        } else {
          options[key] = true;
          i++;
        }
      }
    } else {
      positional.push(arg);
      i++;
    }
  }

  return { command, positional, options };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printHelp();
    process.exit(0);
  }

  const { command, positional, options } = parseArgs(args);

  switch (command) {
    case "convert": {
      const input = positional[0];
      if (!input) {
        console.error("Error: Missing pet directory. Usage: opencode-pet convert <codex-pet-dir>");
        process.exit(1);
      }

      const colorMode = (options["color"] || options["c"] || "truecolor") as string;
      const validModes: ColorMode[] = ["truecolor", "256", "ansi16", "mono"];
      if (!validModes.includes(colorMode as ColorMode)) {
        console.error(`Error: Invalid color mode "${colorMode}". Must be one of: ${validModes.join(", ")}`);
        process.exit(1);
      }

      const convertOptions: ConvertOptions = {
        input,
        output: (options["output"] || options["o"] || join(homedir(), PETS_DIR)) as string,
        colorMode: colorMode as ColorMode,
        fps: 10,
        force: !!options["force"] || !!options["f"],
      };

      if (options["cols"]) convertOptions.cols = parseInt(options["cols"] as string, 10);
      if (options["rows"]) convertOptions.rows = parseInt(options["rows"] as string, 10);
      if (options["frame-width"]) convertOptions.frameWidth = parseInt(options["frame-width"] as string, 10);
      if (options["frame-height"]) convertOptions.frameHeight = parseInt(options["frame-height"] as string, 10);
      if (options["output-width"]) convertOptions.outputWidth = parseInt(options["output-width"] as string, 10);
      if (options["output-height"]) convertOptions.outputHeight = parseInt(options["output-height"] as string, 10);
      if (options["name"]) convertOptions.name = options["name"] as string;

      try {
        await convert(convertOptions);
        console.log("\nDone! Add 'opencode-pet' to your OpenCode plugins to use it.");
      } catch (err: any) {
        console.error(`\nError: ${err.message}`);
        process.exit(1);
      }
      break;
    }

    case "generate": {
      const colorMode = (options["color"] || options["c"] || "truecolor") as string;
      const validModes: ColorMode[] = ["truecolor", "256", "ansi16", "mono"];
      if (!validModes.includes(colorMode as ColorMode)) {
        console.error(`Error: Invalid color mode "${colorMode}". Must be one of: ${validModes.join(", ")}`);
        process.exit(1);
      }

      const bodyTypes = ["blob", "cat", "ghost", "robot", "bunny", "random"];
      const colorSchemes = ["green", "blue", "pink", "purple", "orange", "teal", "random"];
      const animTypes = ["bounce", "wave", "blink", "wiggle", "random"];

      const template: PetTemplate = {
        body: (options["type"] as string || "random") as PetTemplate["body"],
        colors: (options["colors"] as string || "random") as PetTemplate["colors"],
        features: parseInt((options["features"] as string) || "1", 10) || 1,
        animation: (options["animation"] as string || "random") as PetTemplate["animation"],
      };

      if (!bodyTypes.includes(template.body)) {
        console.error(`Error: Invalid body type "${template.body}". Must be one of: ${bodyTypes.join(", ")}`);
        process.exit(1);
      }
      if (!colorSchemes.includes(template.colors)) {
        console.error(`Error: Invalid color scheme "${template.colors}". Must be one of: ${colorSchemes.join(", ")}`);
        process.exit(1);
      }
      if (!animTypes.includes(template.animation)) {
        console.error(`Error: Invalid animation "${template.animation}". Must be one of: ${animTypes.join(", ")}`);
        process.exit(1);
      }

      const ow = parseInt((options["output-width"] as string) || "30", 10);
      const oh = parseInt((options["output-height"] as string) || "16", 10);
      const name = (options["name"] as string) || generatePetName(template);
      const petId = name.toLowerCase().replace(/\s+/g, "-");
      const outputDir = (options["output"] || options["o"] || join(homedir(), PETS_DIR)) as string;
      const petDir = join(outputDir, petId);

      if (existsSync(petDir) && !options["force"] && !options["f"]) {
        console.error(`Error: Pet "${petId}" already exists at ${petDir}. Use --force to overwrite.`);
        process.exit(1);
      }

      console.log(`Generating: ${name} (${template.body}, ${template.colors}, ${template.animation})`);
      const frames = generatePet(template, ow, oh, colorMode as ColorMode);

      const manifest: OpenCodePetManifest = {
        id: petId,
        displayName: name,
        description: `A procedurally generated ${template.body} pet with ${template.colors} colors.`,
        source: "codex",
        frames,
        frameCount: frames.length,
        cols: 0,
        rows: 0,
        convertedAt: new Date().toISOString(),
        converterVersion: CV,
      };

      mkdirSync(petDir, { recursive: true });
      writeFileSync(join(petDir, "pet.json"), JSON.stringify(manifest, null, 2), "utf-8");

      console.log(`Generated ${petId} → ${petDir}`);
      console.log(`  Name: ${name}`);
      console.log(`  Frames: ${manifest.frameCount}`);
      console.log(`  Size: ${ow}x${oh} characters`);
      break;
    }

    case "list": {
      const path = options["path"] as string | undefined;
      const pets = listPets(path);
      if (pets.length === 0) {
        console.log("No pets installed. Convert one with: opencode-pet convert <codex-pet-dir>");
      } else {
        console.log("Installed pets:\n");
        for (const pet of pets) {
          console.log(`  ${pet.id}`);
          console.log(`    Name: ${pet.displayName}`);
          console.log(`    Frames: ${pet.frameCount}`);
          console.log(`    Path: ${pet.path}`);
          console.log();
        }
      }
      break;
    }

    case "remove": {
      const petId = positional[0];
      if (!petId) {
        console.error("Error: Missing pet id. Usage: opencode-pet remove <pet-id>");
        process.exit(1);
      }

      const petsDir = (options["path"] as string) || join(homedir(), PETS_DIR);
      const petDir = join(petsDir, petId);
      if (!existsSync(petDir)) {
        console.error(`Error: Pet "${petId}" not found at ${petDir}`);
        process.exit(1);
      }

      rmSync(petDir, { recursive: true, force: true });
      console.log(`Removed pet "${petId}"`);
      break;
    }

    case "preview": {
      const petId = positional[0];
      if (!petId) {
        console.error("Error: Missing pet id. Usage: opencode-pet preview <pet-id>");
        process.exit(1);
      }

      const petsDir = (options["path"] as string) || join(homedir(), PETS_DIR);
      const manifestPath = join(petsDir, petId, "pet.json");
      if (!existsSync(manifestPath)) {
        console.error(`Error: Pet "${petId}" not found. Convert it first with: opencode-pet convert`);
        process.exit(1);
      }

      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      const frames = manifest.frames as string[][];
      const fps = parseInt((options["fps"] as string) || "10", 10);
      const delay = Math.max(50, Math.floor(1000 / fps));
      const loop = parseInt((options["loop"] as string) || "3", 10);

      process.stdout.write("\x1b[?25l");

      let frameIdx = 0;
      let loops = 0;

      const interval = setInterval(() => {
        if (frameIdx > 0) {
          process.stdout.write(`\x1b[${frames[0].length}A`);
        }

        const frame = frames[frameIdx]!;
        process.stdout.write(frame.join("\n") + "\n");

        frameIdx++;
        if (frameIdx >= frames.length) {
          frameIdx = 0;
          loops++;
          if (loop > 0 && loops >= loop) {
            clearInterval(interval);
            process.stdout.write("\x1b[?25h\n");
            process.exit(0);
          }
        }
      }, delay);

      process.on("SIGINT", () => {
        clearInterval(interval);
        process.stdout.write("\x1b[?25h\n");
        process.exit(0);
      });
      break;
    }

    case "version":
    case "--version":
    case "-v":
      console.log(`opencode-pet v${CONVERTER_VERSION}`);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
