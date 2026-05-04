import type { ColorMode } from "./converter/terminal-art.js";
export type { ColorMode };

export interface CodexPetManifest {
  id: string;
  displayName: string;
  description: string;
  spritesheetPath: string;
}

export interface OpenCodePetManifest {
  id: string;
  displayName: string;
  description: string;
  source: "codex";
  originalPath?: string;
  frames: string[][];
  frameCount: number;
  cols: number;
  rows: number;
  convertedAt: string;
  converterVersion: string;
}

export interface ConvertOptions {
  input: string;
  output: string;
  cols?: number;
  rows?: number;
  frameWidth?: number;
  frameHeight?: number;
  outputWidth?: number;
  outputHeight?: number;
  colorMode: ColorMode;
  fps: number;
  name?: string;
  force: boolean;
}

export interface PetListEntry {
  id: string;
  displayName: string;
  description: string;
  frameCount: number;
  path: string;
}

export const CONVERTER_VERSION = "1.0.0";
export const PETS_DIR = ".opencode/pets";
