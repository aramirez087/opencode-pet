/** @jsxImportSource @opentui/solid */
import {
  createSignal,
  createMemo,
  onCleanup,
  onMount,
  Show,
  Index,
  type JSX,
} from "solid-js";
import type { TuiPluginApi, TuiSlotContext, TuiHostSlotMap } from "@opencode-ai/plugin/tui";
import {
  findPets,
  loadPet,
  loadBundledPet,
  getActivePetId,
  setActivePetId,
} from "./pet-loader.js";
import type { LoadedPet } from "./pet-loader.js";
import type { PetTemplate } from "../converter/generator.js";
import { PET_HEIGHT, PET_WIDTH, PETS_DIR } from "../types.js";
import type { OpenCodePetManifest, PetMood } from "../types.js";
import { SPRITES, spriteToManifest } from "../converter/sprites.js";

type AnsiSegment = { text: string; fg?: string; bg?: string };

const ANSI_RE = /\x1b\[([0-9;]*)m/g;

function parseAnsiLine(line: string): AnsiSegment[] {
  const segments: AnsiSegment[] = [];
  let fg: string | undefined;
  let bg: string | undefined;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  ANSI_RE.lastIndex = 0;

  const pushText = (text: string) => {
    if (text.length === 0) return;
    segments.push({ text, fg, bg });
  };

  while ((match = ANSI_RE.exec(line)) !== null) {
    pushText(line.slice(lastIndex, match.index));
    lastIndex = match.index + match[0].length;

    const params = match[1].length === 0 ? [0] : match[1].split(";").map((p) => parseInt(p, 10) || 0);
    let i = 0;
    while (i < params.length) {
      const code = params[i]!;
      if (code === 0) {
        fg = undefined;
        bg = undefined;
        i += 1;
      } else if (code === 39) {
        fg = undefined;
        i += 1;
      } else if (code === 49) {
        bg = undefined;
        i += 1;
      } else if ((code === 38 || code === 48) && params[i + 1] === 2) {
        const r = params[i + 2] ?? 0;
        const g = params[i + 3] ?? 0;
        const b = params[i + 4] ?? 0;
        const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
        if (code === 38) fg = hex;
        else bg = hex;
        i += 5;
      } else if ((code === 38 || code === 48) && params[i + 1] === 5) {
        const idx = params[i + 2] ?? 0;
        const hex = ansi256ToHex(idx);
        if (code === 38) fg = hex;
        else bg = hex;
        i += 3;
      } else {
        i += 1;
      }
    }
  }
  pushText(line.slice(lastIndex));
  return segments;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace(/^#/, "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// Clip a frame to fit within (width × height) visible cells. Center-crops
// both axes so a legacy 30×16 pet shows its head/eyes region instead of the
// top-left corner. Preserves ANSI escape codes around each kept run.
function clipFrame(lines: string[], width: number, height: number): string[] {
  if (lines.length === 0) return lines;
  const visibleH = Math.min(lines.length, height);
  const top = Math.floor((lines.length - visibleH) / 2);
  return lines.slice(top, top + visibleH).map((line) => clipLine(line, width));
}

function clipLine(line: string, width: number): string {
  const segments = parseAnsiLine(line);
  const totalWidth = segments.reduce((sum, s) => sum + s.text.length, 0);
  if (totalWidth <= width) return line;

  const skip = Math.floor((totalWidth - width) / 2);
  let consumed = 0;
  let kept = 0;
  let out = "";

  for (const seg of segments) {
    const segStart = consumed;
    consumed += seg.text.length;
    if (consumed <= skip) continue;
    if (kept >= width) break;

    const localStart = Math.max(0, skip - segStart);
    const localEnd = Math.min(seg.text.length, localStart + (width - kept));
    const chunk = seg.text.slice(localStart, localEnd);
    if (chunk.length === 0) continue;

    if (seg.fg) {
      const { r, g, b } = hexToRgb(seg.fg);
      out += `\x1b[38;2;${r};${g};${b}m`;
    }
    if (seg.bg) {
      const { r, g, b } = hexToRgb(seg.bg);
      out += `\x1b[48;2;${r};${g};${b}m`;
    }
    if (!seg.fg && !seg.bg) out += "\x1b[0m";
    out += chunk;
    kept += chunk.length;
  }
  out += "\x1b[0m";
  return out;
}

function ansi256ToHex(idx: number): string {
  if (idx < 16) {
    const basic = [
      "#000000", "#800000", "#008000", "#808000", "#000080", "#800080", "#008080", "#c0c0c0",
      "#808080", "#ff0000", "#00ff00", "#ffff00", "#0000ff", "#ff00ff", "#00ffff", "#ffffff",
    ];
    return basic[idx]!;
  }
  if (idx >= 232) {
    const v = 8 + (idx - 232) * 10;
    return `#${v.toString(16).padStart(2, "0").repeat(3)}`;
  }
  const n = idx - 16;
  const r = Math.floor(n / 36);
  const g = Math.floor((n % 36) / 6);
  const b = n % 6;
  const ramp = [0, 95, 135, 175, 215, 255];
  const hex = (v: number) => ramp[v]!.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// ─── Adaptive frame delay ─────────────────────────────────────

function detectTerminalFps(): number {
  const term = (typeof process !== "undefined" && process.env.TERM) || "";
  const termProgram = (typeof process !== "undefined" && process.env.TERM_PROGRAM) || "";
  const isTmux = !!(typeof process !== "undefined" && process.env.TMUX);
  const isScreen = !!(typeof process !== "undefined" && process.env.STY);

  if (isTmux || isScreen) return 8;
  if (term === "xterm-kitty") return 12;
  if (term === "alacritty") return 12;
  if (termProgram === "WezTerm") return 12;
  if (termProgram === "WarpTerminal") return 12;
  if (typeof process !== "undefined" && process.env.WT_SESSION) return 8;
  return 10;
}

// ─── Mood-aware animation ─────────────────────────────────────

const MOOD_REACTION_LINGER = 1500;
const TYPING_LINGER = 2000;

function moodFps(mood: PetMood, baseFps: number): number {
  switch (mood) {
    case "thinking": return baseFps;
    case "happy": return Math.min(baseFps + 2, 14);
    case "confused": return Math.max(baseFps - 4, 5);
    case "watching": return Math.max(baseFps - 5, 3);
    case "idle": return 2;
  }
}

const [activePet, setActivePet] = createSignal<LoadedPet | null>(null);

const tui = async (api: TuiPluginApi): Promise<void> => {
  const lastError = { message: "" };

  const safeToast = (message: string, variant: "info" | "success" | "warning" | "error") => {
    try {
      api.ui.toast({ message, variant });
    } catch (err) {
      console.error(`opencode-pet: ${message}`, err);
    }
  };

  function resolveActivePet(): LoadedPet | null {
    try {
      const activeId = getActivePetId(api.kv);
      if (activeId) {
        const found = loadPet(activeId);
        if (found) return found;
      }
      const all = findPets();
      if (all.length > 0) {
        const pet = all[0]!;
        setActivePetId(api.kv, pet.manifest.id);
        return pet;
      }
      return loadBundledPet();
    } catch (err) {
      lastError.message = err instanceof Error ? err.message : String(err);
      return loadBundledPet();
    }
  }

  function refreshActivePet(): void {
    setActivePet(resolveActivePet());
  }

  refreshActivePet();

  ensureSpritesInstalled(api.kv, refreshActivePet, safeToast).catch(() => {});

  try {
    api.command.register(() => {
      try {
        const pets = findPets();
        const activeId = getActivePetId(api.kv);
        return [
          {
            title: "Switch Pet...",
            value: "opencode-pet:switch",
            description: "Change your active companion",
            category: "Pets",
            slash: { name: "pet", aliases: ["pet-switch", "pets"] },
            onSelect: () => showPetPicker(api, refreshActivePet, safeToast),
          },
          {
            title: "Generate New Pet",
            value: "opencode-pet:generate",
            description: "Create a new random pet companion",
            category: "Pets",
            slash: { name: "pet-generate", aliases: ["pet-new"] },
            onSelect: () => generateRandomPet(api, refreshActivePet, safeToast),
          },
          {
            title: "Remove Pet...",
            value: "opencode-pet:remove",
            description: "Delete an installed pet from disk",
            category: "Pets",
            slash: { name: "pet-remove", aliases: ["pet-delete"] },
            onSelect: () => showPetRemover(api, refreshActivePet, safeToast),
          },
          {
            title: "Pet Debug Info",
            value: "opencode-pet:debug",
            description: "Show diagnostic info for the pet plugin",
            category: "Pets",
            slash: { name: "pet-debug" },
            onSelect: () => {
              const pet = activePet();
              const summary = [
                `pets=${pets.length}`,
                `active=${pet?.manifest.id ?? "(none)"}`,
                `kv.ready=${api.kv?.ready ?? "?"}`,
                `lastError=${lastError.message || "(none)"}`,
              ].join(" ");
              safeToast(summary, "info");
            },
          },
          ...pets.map((pet) => ({
            title: `${pet.manifest.displayName}${pet.manifest.id === activeId ? " (active)" : ""}`,
            value: `opencode-pet:activate:${pet.manifest.id}`,
            description: `${pet.manifest.frameCount} frames · ${pet.manifest.description || "Converted pet"}`,
            category: "Pets",
            slash: { name: `pet-${pet.manifest.id}`, aliases: [`pet:${pet.manifest.id}`] },
            onSelect: () => {
              setActivePetId(api.kv, pet.manifest.id);
              refreshActivePet();
              safeToast(`Switched to ${pet.manifest.displayName}`, "success");
            },
          })),
        ];
      } catch (err) {
        lastError.message = err instanceof Error ? err.message : String(err);
        safeToast(`opencode-pet command error: ${lastError.message}`, "error");
        return [];
      }
    });
  } catch (err) {
    lastError.message = err instanceof Error ? err.message : String(err);
    safeToast(`opencode-pet failed to register commands: ${lastError.message}`, "error");
  }

  try {
    api.slots.register({
      slots: {
        session_prompt_right: (
          _ctx: TuiSlotContext,
          props: TuiHostSlotMap["session_prompt_right"],
        ): JSX.Element => {
          const [mood, setMood] = createSignal<PetMood>("idle");
          const [visible, setVisible] = createSignal(false);
          const [frameIdx, setFrameIdx] = createSignal(0);

          let moodTimer: ReturnType<typeof setTimeout> | undefined;
          let animTimer: ReturnType<typeof setTimeout> | undefined;

          function clearTimers(): void {
            if (moodTimer) { clearTimeout(moodTimer); moodTimer = undefined; }
            if (animTimer) { clearTimeout(animTimer); animTimer = undefined; }
          }

          function startAnimation(fps: number): void {
            if (animTimer) { clearTimeout(animTimer); animTimer = undefined; }
            const delay = Math.max(50, Math.floor(1000 / fps));
            let stopped = false;

            function tick(): void {
              if (stopped) return;
              const pet = activePet();
              if (!pet || pet.manifest.frames.length === 0) return;
              setFrameIdx((i) => (i + 1) % pet.manifest.frames.length);
              animTimer = setTimeout(tick, delay);
            }
            animTimer = setTimeout(tick, delay);
          }

          function transitionMood(next: PetMood): void {
            if (moodTimer) { clearTimeout(moodTimer); moodTimer = undefined; }
            setMood(next);

            const pet = activePet();
            if (!pet || pet.manifest.frames.length === 0) {
              setVisible(false);
              clearTimers();
              return;
            }

            setVisible(true);
            const baseFps = detectTerminalFps();
            const fps = moodFps(next, baseFps);
            startAnimation(fps);

            if (next === "happy" || next === "confused") {
              moodTimer = setTimeout(() => transitionMood("idle"), MOOD_REACTION_LINGER);
            } else if (next === "watching") {
              moodTimer = setTimeout(() => transitionMood("idle"), TYPING_LINGER);
            }
          }

          onMount(() => {
            const unsubStatus = api.event.on("session.status", (event) => {
              if (event.properties.sessionID !== props.session_id) return;
              const type = event.properties.status.type as string;
              if (type === "busy") {
                transitionMood("thinking");
              } else if (type === "error") {
                transitionMood("confused");
              } else {
                transitionMood("happy");
              }
            });
            const unsubIdle = api.event.on("session.idle", (event) => {
              if (event.properties.sessionID !== props.session_id) return;
              if (mood() === "thinking") {
                transitionMood("idle");
              }
            });
            const unsubPrompt = api.event.on("tui.prompt.append", () => {
              if (mood() !== "thinking") {
                transitionMood("watching");
              }
            });
            onCleanup(() => {
              unsubStatus();
              unsubIdle();
              unsubPrompt();
              clearTimers();
            });
          });

          const currentFrame = createMemo<string[]>(() => {
            const pet = activePet();
            if (!pet) return [];
            const frames = pet.manifest.frames;
            if (frames.length === 0) return [];
            return frames[frameIdx() % frames.length] ?? [];
          });

          const visibleFrame = createMemo<string[]>(() => {
            const lines = currentFrame();
            if (lines.length === 0) return lines;
            return clipFrame(lines, PET_WIDTH, PET_HEIGHT);
          });

          return (
            <box
              flexDirection="column"
              width={PET_WIDTH}
              height={PET_HEIGHT}
              overflow="hidden"
            >
              <Show when={visible() && activePet() !== null}>
                <Index each={visibleFrame()}>
                  {(line) => (
                    <text>
                      <Index each={parseAnsiLine(line())}>
                        {(seg) => (
                          <span fg={seg().fg} bg={seg().bg}>{seg().text}</span>
                        )}
                      </Index>
                    </text>
                  )}
                </Index>
              </Show>
            </box>
          );
        },
      },
    });
  } catch (err) {
    lastError.message = err instanceof Error ? err.message : String(err);
    safeToast(`opencode-pet failed to register slot: ${lastError.message}`, "error");
  }
};

export default { tui };

type ToastFn = (message: string, variant: "info" | "success" | "warning" | "error") => void;

function showPetPicker(api: TuiPluginApi, refresh: () => void, toast: ToastFn): void {
  const pets = findPets();
  if (pets.length === 0) {
    toast("No pets installed. Use /pet-generate to create one!", "warning");
    return;
  }

  const activeId = getActivePetId(api.kv);
  api.ui.dialog.replace(
    () =>
      api.ui.DialogSelect({
        title: "Select Pet",
        options: pets.map((pet) => ({
          title: `${pet.manifest.displayName}${pet.manifest.id === activeId ? " ★" : ""}`,
          value: pet.manifest.id,
          description: pet.manifest.description || `${pet.manifest.frameCount} frames`,
        })),
        onSelect: (option) => {
          setActivePetId(api.kv, option.value as string);
          refresh();
          toast(`Switched to ${option.title}`, "success");
          api.ui.dialog.clear();
        },
      }),
    () => {
      // on close
    },
  );
}

function showPetRemover(api: TuiPluginApi, refresh: () => void, toast: ToastFn): void {
  const pets = findPets();
  if (pets.length === 0) {
    toast("No pets to remove.", "info");
    return;
  }

  const activeId = getActivePetId(api.kv);
  api.ui.dialog.replace(
    () =>
      api.ui.DialogSelect({
        title: "Remove Pet (cannot be undone)",
        options: pets.map((pet) => ({
          title: `${pet.manifest.displayName}${pet.manifest.id === activeId ? " ★" : ""}`,
          value: pet.manifest.id,
          description: pet.manifest.description || `${pet.manifest.frameCount} frames · ${pet.path}`,
        })),
        onSelect: async (option) => {
          api.ui.dialog.clear();
          try {
            const target = pets.find((p) => p.manifest.id === option.value);
            if (!target) {
              toast(`Pet "${option.value}" not found.`, "error");
              return;
            }
            const { rmSync } = await import("node:fs");
            rmSync(target.path, { recursive: true, force: true });

            if (activeId === target.manifest.id) {
              const remaining = findPets();
              const next = remaining[0];
              setActivePetId(api.kv, next ? next.manifest.id : "");
            }

            refresh();
            toast(`Removed "${target.manifest.displayName}"`, "success");
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast(`Failed to remove pet: ${msg}`, "error");
          }
        },
      }),
    () => {
      // on close
    },
  );
}

async function generateRandomPet(api: TuiPluginApi, refresh: () => void, toast: ToastFn): Promise<void> {
  toast("Generating new pet...", "info");

  try {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { homedir } = await import("node:os");

    const { PETS_DIR, CONVERTER_VERSION } = await import("../types.js");

    // 70% curated sprite, 30% procedural — curated produces nicer pixel art at this size.
    const useSprite = Math.random() < 0.7;
    let petId: string;
    let displayName: string;
    let manifest: OpenCodePetManifest;

    if (useSprite) {
      const { SPRITES, spriteToManifest } = await import("../converter/sprites.js");
      const sprite = SPRITES[Math.floor(Math.random() * SPRITES.length)]!;
      // Append a short suffix so re-rolls don't collide on the same id.
      const suffix = Math.random().toString(36).slice(2, 5);
      petId = `${sprite.id}-${suffix}`;
      displayName = sprite.displayName;
      const base = spriteToManifest(sprite);
      manifest = { ...base, id: petId, displayName };
    } else {
      const { generatePet, generatePetName } = await import("../converter/generator.js");

      const bodies = ["blob", "cat", "ghost", "robot", "bunny"] as const;
      const colors = ["green", "blue", "pink", "purple", "orange", "teal"] as const;
      const anims = ["bounce", "wave", "blink", "wiggle"] as const;

      const rand = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
      const template: PetTemplate = {
        body: rand(bodies),
        colors: rand(colors),
        features: Math.floor(Math.random() * 2) + 1,
        animation: rand(anims),
      };

      displayName = generatePetName(template);
      petId = displayName.toLowerCase().replace(/\s+/g, "-");
      const frames = generatePet(template, PET_WIDTH, PET_HEIGHT, "truecolor");

      manifest = {
        id: petId,
        displayName,
        description: `A procedurally generated ${template.body} pet with ${template.colors} colors.`,
        source: "codex",
        frames,
        frameCount: frames.length,
        cols: 0,
        rows: 0,
        convertedAt: new Date().toISOString(),
        converterVersion: CONVERTER_VERSION,
      };
    }

    const petDir = join(homedir(), PETS_DIR, petId);
    mkdirSync(petDir, { recursive: true });
    writeFileSync(join(petDir, "pet.json"), JSON.stringify(manifest), "utf-8");

    setActivePetId(api.kv, petId);
    refresh();

    toast(`Created "${displayName}" — your new companion is ready!`, "success");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    toast(`Failed to generate pet: ${msg}`, "error");
  }
}

async function ensureSpritesInstalled(kv: KvWriter | undefined | null, refresh: () => void, toast: ToastFn): Promise<void> {
  try {
    const { mkdirSync, writeFileSync, readdirSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { homedir } = await import("node:os");

    const petsDir = join(homedir(), PETS_DIR);
    if (!existsSync(petsDir)) {
      mkdirSync(petsDir, { recursive: true });
    }

    const installed = new Set(readdirSync(petsDir));
    let count = 0;
    for (const sprite of SPRITES) {
      if (installed.has(sprite.id)) continue;
      const petDir = join(petsDir, sprite.id);
      mkdirSync(petDir, { recursive: true });
      const manifest = spriteToManifest(sprite);
      writeFileSync(join(petDir, "pet.json"), JSON.stringify(manifest), "utf-8");
      count += 1;
    }

    if (count > 0) {
      const activeId = getActivePetId(kv);
      if (!activeId) {
        setActivePetId(kv, SPRITES[0]!.id);
      }
      refresh();
      toast(`Installed ${count} new pet(s). Pick one with /pet!`, "info");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`opencode-pet: failed to install sprites: ${msg}`);
  }
}
