import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { PETS_DIR } from "../types.js";
import type { OpenCodePetManifest } from "../types.js";

export interface LoadedPet {
  manifest: OpenCodePetManifest;
  path: string;
}

export function findPets(baseDir?: string): LoadedPet[] {
  const dir = baseDir || join(homedir(), PETS_DIR);
  if (!existsSync(dir)) return [];

  const pets: LoadedPet[] = [];

  try {
    for (const entry of readdirSync(dir)) {
      const petDir = join(dir, entry);
      const manifestPath = join(petDir, "pet.json");
      if (!existsSync(manifestPath)) continue;

      try {
        const manifest = JSON.parse(
          readFileSync(manifestPath, "utf-8"),
        ) as OpenCodePetManifest;
        if (manifest.frames && manifest.frames.length > 0) {
          pets.push({ manifest, path: petDir });
        }
      } catch {
        // Skip invalid pets
      }
    }
  } catch {
    // Directory might not exist or be unreadable
  }

  return pets;
}

export function loadPet(
  petId: string,
  baseDir?: string,
): LoadedPet | null {
  const dir = baseDir || join(homedir(), PETS_DIR);
  const petDir = join(dir, petId);
  const manifestPath = join(petDir, "pet.json");

  if (!existsSync(manifestPath)) return null;

  try {
    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf-8"),
    ) as OpenCodePetManifest;
    return { manifest, path: petDir };
  } catch {
    return null;
  }
}

export function getDefaultPet(baseDir?: string): LoadedPet | null {
  const pets = findPets(baseDir);
  return pets.length > 0 ? pets[0]! : null;
}

let bundledPetCache: LoadedPet | null | undefined;

export function loadBundledPet(): LoadedPet | null {
  if (bundledPetCache !== undefined) return bundledPetCache;

  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // src/plugin/pet-loader.ts -> ../../assets/default-pet.json
    const assetPath = join(here, "..", "..", "assets", "default-pet.json");
    if (!existsSync(assetPath)) {
      bundledPetCache = null;
      return null;
    }
    const manifest = JSON.parse(readFileSync(assetPath, "utf-8")) as OpenCodePetManifest;
    bundledPetCache = { manifest, path: assetPath };
    return bundledPetCache;
  } catch {
    bundledPetCache = null;
    return null;
  }
}

const ACTIVE_PET_KEY = "opencode-pet:active";

interface KvLike {
  get: <T = unknown>(key: string, fallback?: T) => T;
  readonly ready?: boolean;
}

interface KvWriter {
  set: (key: string, value: unknown) => void;
  readonly ready?: boolean;
}

export function getActivePetId(kv: KvLike | undefined | null): string | null {
  if (!kv) return null;
  if (kv.ready === false) return null;
  try {
    const id = kv.get<unknown>(ACTIVE_PET_KEY);
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}

export function setActivePetId(
  kv: KvWriter | undefined | null,
  petId: string,
): void {
  if (!kv) return;
  if (kv.ready === false) return;
  try {
    kv.set(ACTIVE_PET_KEY, petId);
  } catch {
    // ignore
  }
}
