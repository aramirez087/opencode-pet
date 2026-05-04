/** @jsxImportSource @opentui/solid */
import {
  createSignal,
  createMemo,
  createEffect,
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
        session_prompt: (
          _ctx: TuiSlotContext,
          props: TuiHostSlotMap["session_prompt"],
        ): JSX.Element => {
          const [busy, setBusy] = createSignal(false);
          const [frameIdx, setFrameIdx] = createSignal(0);

          onMount(() => {
            const unsubStatus = api.event.on("session.status", (event) => {
              if (event.properties.sessionID !== props.session_id) return;
              setBusy(event.properties.status.type === "busy");
            });
            const unsubIdle = api.event.on("session.idle", (event) => {
              if (event.properties.sessionID !== props.session_id) return;
              setBusy(false);
              setFrameIdx(0);
            });
            onCleanup(() => {
              unsubStatus();
              unsubIdle();
            });
          });

          createEffect(() => {
            if (!busy()) return;
            const pet = activePet();
            if (!pet || pet.manifest.frames.length === 0) return;

            const fps = 10;
            const delay = Math.max(50, Math.floor(1000 / fps));
            const interval = setInterval(() => {
              setFrameIdx((i) => (i + 1) % pet.manifest.frames.length);
            }, delay);
            onCleanup(() => clearInterval(interval));
          });

          const currentFrame = createMemo<string[]>(() => {
            const pet = activePet();
            if (!pet) return [];
            const frames = pet.manifest.frames;
            if (frames.length === 0) return [];
            return frames[frameIdx() % frames.length] ?? [];
          });

          return (
            <box flexDirection="column">
              <Show when={busy() && activePet() !== null}>
                <Index each={currentFrame()}>
                  {(line) => <text>{line()}</text>}
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

async function generateRandomPet(api: TuiPluginApi, refresh: () => void, toast: ToastFn): Promise<void> {
  toast("Generating new pet...", "info");

  try {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { homedir } = await import("node:os");

    const { generatePet, generatePetName } = await import("../converter/generator.js");
    const { PETS_DIR, CONVERTER_VERSION } = await import("../types.js");

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

    const name = generatePetName(template);
    const petId = name.toLowerCase().replace(/\s+/g, "-");
    const frames = generatePet(template, 30, 16, "truecolor");

    const petDir = join(homedir(), PETS_DIR, petId);
    mkdirSync(petDir, { recursive: true });

    const manifest = {
      id: petId,
      displayName: name,
      description: `A procedurally generated ${template.body} pet with ${template.colors} colors.`,
      source: "codex" as const,
      frames,
      frameCount: frames.length,
      cols: 0,
      rows: 0,
      convertedAt: new Date().toISOString(),
      converterVersion: CONVERTER_VERSION,
    };

    writeFileSync(join(petDir, "pet.json"), JSON.stringify(manifest), "utf-8");

    setActivePetId(api.kv, petId);
    refresh();

    toast(`Created "${name}" — your new companion is ready!`, "success");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    toast(`Failed to generate pet: ${msg}`, "error");
  }
}
