import { frameToTerminal, type ColorMode } from "./terminal-art.js";

export interface PetTemplate {
  body: "blob" | "cat" | "ghost" | "robot" | "bunny" | "random";
  colors: "green" | "blue" | "pink" | "purple" | "orange" | "teal" | "random";
  features: number;
  animation: "bounce" | "wave" | "blink" | "wiggle" | "random";
  name?: string;
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface BodyConfig {
  bodyColor: RGBA;
  accentColor: RGBA;
  eyeColor: RGBA;
  mouthColor: RGBA;
  outlineColor: RGBA;
  scarfColor: RGBA;
  hatColor: RGBA;
  glassesColor: RGBA;
}

const COLOR_PALETTES: Record<string, { body: string; accent: string; scarf: string; hat: string; glasses: string }> = {
  green:   { body: "#4ade80", accent: "#166534", scarf: "#fbbf24", hat: "#1e3a5f", glasses: "#1e293b" },
  blue:    { body: "#60a5fa", accent: "#1e3a8a", scarf: "#f472b6", hat: "#f59e0b", glasses: "#0f172a" },
  pink:    { body: "#f472b6", accent: "#831843", scarf: "#a78bfa", hat: "#fef3c7", glasses: "#1e293b" },
  purple:  { body: "#a78bfa", accent: "#4c1d95", scarf: "#fbbf24", hat: "#059669", glasses: "#1e293b" },
  orange:  { body: "#fb923c", accent: "#7c2d12", scarf: "#60a5fa", hat: "#166534", glasses: "#1e293b" },
  teal:    { body: "#2dd4bf", accent: "#134e4a", scarf: "#fbbf24", hat: "#b45309", glasses: "#1e293b" },
};

function hexToRGBA(hex: string): RGBA {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b, a: 255 };
}

function rgbaEqual(a: RGBA, b: RGBA): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

function luminance(c: RGBA): number {
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}

function darken(c: RGBA, factor: number): RGBA {
  return { r: Math.round(c.r * (1 - factor)), g: Math.round(c.g * (1 - factor)), b: Math.round(c.b * (1 - factor)), a: 255 };
}

function lighten(c: RGBA, factor: number): RGBA {
  return {
    r: Math.round(c.r + (255 - c.r) * factor),
    g: Math.round(c.g + (255 - c.g) * factor),
    b: Math.round(c.b + (255 - c.b) * factor),
    a: 255,
  };
}

function blend(a: RGBA, b: RGBA, t: number): RGBA {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
    a: 255,
  };
}

export function generatePet(
  template: PetTemplate,
  width: number,
  height: number,
  colorMode: ColorMode,
): string[][] {
  const rand = createRng(template.name || template.body + template.colors + Date.now());

  const bodyType = template.body === "random"
    ? pick(["blob", "cat", "ghost", "robot", "bunny"], rand)
    : template.body;

  const paletteName = template.colors === "random"
    ? pick(Object.keys(COLOR_PALETTES), rand)
    : template.colors;

  const animType = template.animation === "random"
    ? pick(["bounce", "wave", "blink", "wiggle"], rand)
    : template.animation;

  const palette = COLOR_PALETTES[paletteName]!;
  const featureCount = template.features || rand(1, 2);

  const config: BodyConfig = {
    bodyColor: hexToRGBA(palette.body),
    accentColor: hexToRGBA(palette.accent),
    eyeColor: { r: 255, g: 255, b: 255, a: 255 },
    mouthColor: hexToRGBA(palette.accent),
    outlineColor: hexToRGBA(palette.accent),
    scarfColor: hexToRGBA(palette.scarf),
    hatColor: hexToRGBA(palette.hat),
    glassesColor: hexToRGBA(palette.glasses),
  };

  // Pixel canvas: each "pixel" is a character cell, 2 subpixels vertically
  const pw = width;
  const ph = height * 2;
  const cx = pw / 2;
  const cy = ph / 2;

  // Generate frame count
  const frameCount = animType === "blink" ? 8 : animType === "wiggle" ? 12 : 10;
  const frames: string[][] = [];

  for (let f = 0; f < frameCount; f++) {
    const t = f / frameCount;
    const canvas = createCanvas(pw, ph);

    let bounceOffset = 0;
    if (animType === "bounce") {
      bounceOffset = Math.round(Math.sin(t * Math.PI * 2) * 2);
    }

    let waveOffset = 0;
    if (animType === "wave") {
      waveOffset = Math.sin(t * Math.PI * 2) * 0.5;
    }

    let wiggleX = 0;
    if (animType === "wiggle") {
      wiggleX = Math.sin(t * Math.PI * 2) * 1.5;
    }

    let eyeScale = 1;
    if (animType === "blink" && f % 4 === 3) {
      eyeScale = 0.15;
    }

    const bcx = cx + wiggleX;
    const bcy = cy + bounceOffset;

    switch (bodyType) {
      case "blob":
        drawBlob(canvas, pw, ph, bcx, bcy, config, waveOffset, rand);
        break;
      case "cat":
        drawCat(canvas, pw, ph, bcx, bcy, config, waveOffset, rand);
        break;
      case "ghost":
        drawGhost(canvas, pw, ph, bcx, bcy, config, t, rand);
        break;
      case "robot":
        drawRobot(canvas, pw, ph, bcx, bcy, config, t, rand);
        break;
      case "bunny":
        drawBunny(canvas, pw, ph, bcx, bcy, config, waveOffset, bounceOffset, rand);
        break;
    }

    drawEyes(canvas, pw, bcx, bcy - 2, config, eyeScale);
    drawMouth(canvas, pw, bcx, bcy + 3, config, t);

    if (featureCount >= 1) {
      const feat = pick(["scarf", "hat", "glasses", "bow"], rand);
      switch (feat) {
        case "scarf":
          drawScarf(canvas, pw, bcx, bcy + 1, config, waveOffset);
          break;
        case "hat":
          drawHat(canvas, pw, bcx, bcy, config, waveOffset);
          break;
        case "glasses":
          drawGlasses(canvas, pw, bcx, bcy, config);
          break;
        case "bow":
          drawBow(canvas, pw, bcx, bcy, config, rand);
          break;
      }
    }

    // Convert pixel canvas to RGBA buffer for terminal-art converter
    const buf = Buffer.alloc(pw * ph * 4);
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const p = canvas[y]![x]!;
        const idx = (y * pw + x) * 4;
        buf[idx] = p.r;
        buf[idx + 1] = p.g;
        buf[idx + 2] = p.b;
        buf[idx + 3] = p.a;
      }
    }

    const lines = frameToTerminal(
      { data: buf, width: pw, height: ph },
      pw,
      Math.floor(ph / 2),
      colorMode,
      true,
    );
    frames.push(lines);
  }

  return frames;
}

// ─── Drawing primitives ──────────────────────────────────────

type Canvas = RGBA[][];

function createCanvas(w: number, h: number): Canvas {
  const c: Canvas = [];
  for (let y = 0; y < h; y++) {
    c[y] = [];
    for (let x = 0; x < w; x++) {
      c[y]![x] = { r: 0, g: 0, b: 0, a: 0 };
    }
  }
  return c;
}

function setPixel(c: Canvas, x: number, y: number, color: RGBA): void {
  const px = Math.round(x);
  const py = Math.round(y);
  if (py >= 0 && py < c.length && px >= 0 && px < (c[0]?.length ?? 0)) {
    const existing = c[py]![px]!;
    if (color.a >= 250) {
      c[py]![px] = color;
    } else if (existing.a === 0) {
      c[py]![px] = color;
    } else {
      const a = color.a / 255;
      c[py]![px] = {
        r: Math.round(existing.r * (1 - a) + color.r * a),
        g: Math.round(existing.g * (1 - a) + color.g * a),
        b: Math.round(existing.b * (1 - a) + color.b * a),
        a: Math.max(existing.a, color.a),
      };
    }
  }
}

function fillCircle(c: Canvas, cx: number, cy: number, r: number, color: RGBA): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        setPixel(c, x, y, color);
      }
    }
  }
}

function fillEllipse(c: Canvas, cx: number, cy: number, rx: number, ry: number, color: RGBA): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        setPixel(c, x, y, color);
      }
    }
  }
}

function fillRect(c: Canvas, x: number, y: number, w: number, h: number, color: RGBA): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(c, x + dx, y + dy, color);
    }
  }
}

// ─── Body types ───────────────────────────────────────────────

function drawBlob(
  c: Canvas, pw: number, ph: number, cx: number, cy: number,
  config: BodyConfig, wobble: number, rand: Rng,
): void {
  const baseR = Math.min(pw, ph) * 0.35;
  const bodyR = baseR + Math.sin(wobble * 3) * 3;
  fillCircle(c, cx, cy, bodyR, config.bodyColor);
  fillCircle(c, cx, cy, bodyR * 0.9, lighten(config.bodyColor, 0.15));
  fillCircle(c, cx - 2, cy - 2, bodyR * 0.6, lighten(config.bodyColor, 0.3));
}

function drawCat(
  c: Canvas, pw: number, ph: number, cx: number, cy: number,
  config: BodyConfig, wobble: number, rand: Rng,
): void {
  const headR = Math.min(pw, ph) * 0.28;
  const bodyR = Math.min(pw, ph) * 0.22;
  // Body
  fillEllipse(c, cx, cy + headR * 0.6, bodyR, bodyR * 1.1, darken(config.bodyColor, 0.1));
  // Head
  fillCircle(c, cx, cy - headR * 0.3, headR, config.bodyColor);
  fillCircle(c, cx, cy - headR * 0.3, headR * 0.85, lighten(config.bodyColor, 0.15));
  // Ears (triangles via small ellipses)
  fillEllipse(c, cx - headR * 0.7, cy - headR * 0.9, headR * 0.35, headR * 0.55, config.bodyColor);
  fillEllipse(c, cx + headR * 0.7, cy - headR * 0.9, headR * 0.35, headR * 0.55, config.bodyColor);
  // Inner ears
  fillEllipse(c, cx - headR * 0.7, cy - headR * 0.9, headR * 0.2, headR * 0.35, lighten(config.bodyColor, 0.2));
  fillEllipse(c, cx + headR * 0.7, cy - headR * 0.9, headR * 0.2, headR * 0.35, lighten(config.bodyColor, 0.2));
  // Nose
  fillEllipse(c, cx, cy - headR * 0.05, 2, 1.5, darken(config.bodyColor, 0.3));
}

function drawGhost(
  c: Canvas, pw: number, ph: number, cx: number, cy: number,
  config: BodyConfig, t: number, rand: Rng,
): void {
  const bodyW = Math.min(pw, ph) * 0.35;
  const bodyH = bodyW * 1.3;
  // Main body (rounded top, wavy bottom)
  fillEllipse(c, cx, cy - bodyH * 0.2, bodyW, bodyH * 0.7, config.bodyColor);
  fillRect(c, cx - bodyW, cy, bodyW * 2, bodyH * 0.4, config.bodyColor);
  // Wavy bottom
  for (let x = cx - bodyW; x <= cx + bodyW; x++) {
    const wave = Math.sin((x - cx) * 0.5 + t * 2) * 3;
    for (let y = cy + bodyH * 0.35; y <= cy + bodyH * 0.35 + 4 + wave; y++) {
      setPixel(c, x, y, config.bodyColor);
    }
  }
  // Highlight
  fillEllipse(c, cx - bodyW * 0.4, cy - bodyH * 0.3, bodyW * 0.3, bodyH * 0.2, lighten(config.bodyColor, 0.3));
}

function drawRobot(
  c: Canvas, pw: number, ph: number, cx: number, cy: number,
  config: BodyConfig, t: number, rand: Rng,
): void {
  const size = Math.min(pw, ph) * 0.3;
  // Head
  fillRect(c, cx - size * 0.8, cy - size * 1.1, size * 1.6, size * 1.1, config.bodyColor);
  fillRect(c, cx - size * 0.65, cy - size * 0.95, size * 1.3, size * 0.8, darken(config.bodyColor, 0.15));
  // Antenna
  fillRect(c, cx - 1, cy - size * 1.5, 2, size * 0.45, config.accentColor);
  fillCircle(c, cx, cy - size * 1.5, 2, config.accentColor);
  // Body
  fillRect(c, cx - size * 0.6, cy, size * 1.2, size * 0.9, config.bodyColor);
  // Chest panel
  fillRect(c, cx - size * 0.35, cy + size * 0.1, size * 0.7, size * 0.5, config.accentColor);
  // Blinking chest light
  if (Math.floor(t * 4) % 2 === 0) {
    fillCircle(c, cx, cy + size * 0.35, 2, config.eyeColor);
  }
}

function drawBunny(
  c: Canvas, pw: number, ph: number, cx: number, cy: number,
  config: BodyConfig, wobble: number, bounce: number, rand: Rng,
): void {
  const headR = Math.min(pw, ph) * 0.25;
  const bodyR = Math.min(pw, ph) * 0.22;
  // Body
  fillEllipse(c, cx, cy + headR * 0.7, bodyR, bodyR * 1.2, config.bodyColor);
  fillEllipse(c, cx, cy + headR * 0.7, bodyR * 0.85, bodyR, lighten(config.bodyColor, 0.15));
  // Head
  fillCircle(c, cx, cy - headR * 0.3, headR, config.bodyColor);
  fillCircle(c, cx, cy - headR * 0.3, headR * 0.85, lighten(config.bodyColor, 0.2));
  // Ears
  const earTilt = Math.sin(wobble * 2) * 0.3;
  fillEllipse(c, cx - headR * 0.5, cy - headR * 1.5 - bounce, headR * 0.25, headR * 0.8, config.bodyColor);
  fillEllipse(c, cx + headR * 0.5, cy - headR * 1.5 + bounce, headR * 0.25, headR * 0.8, config.bodyColor);
  // Inner ears
  fillEllipse(c, cx - headR * 0.5, cy - headR * 1.5 - bounce, headR * 0.15, headR * 0.55, lighten(config.bodyColor, 0.3));
  fillEllipse(c, cx + headR * 0.5, cy - headR * 1.5 + bounce, headR * 0.15, headR * 0.55, lighten(config.bodyColor, 0.3));
  // Nose
  fillEllipse(c, cx, cy, 1.5, 1, darken(config.bodyColor, 0.3));
}

// ─── Features ────────────────────────────────────────────────

function drawEyes(
  c: Canvas, pw: number, cx: number, ey: number,
  config: BodyConfig, scale: number,
): void {
  const eyeSpacing = 4;
  const eyeR = 2.5 * scale;

  // Left eye
  fillCircle(c, cx - eyeSpacing, ey, eyeR, config.eyeColor);
  fillCircle(c, cx - eyeSpacing - 0.5, ey, 1.2 * scale, config.outlineColor);
  // Right eye
  fillCircle(c, cx + eyeSpacing, ey, eyeR, config.eyeColor);
  fillCircle(c, cx + eyeSpacing + 0.5, ey, 1.2 * scale, config.outlineColor);
}

function drawMouth(
  c: Canvas, pw: number, cx: number, my: number,
  config: BodyConfig, t: number,
): void {
  // Small smile arc
  for (let x = -3; x <= 3; x++) {
    const curve = Math.abs(x) * 0.4 - 1;
    const y = my + curve;
    setPixel(c, cx + x, Math.round(y), config.mouthColor);
  }
}

function drawScarf(
  c: Canvas, pw: number, cx: number, y: number,
  config: BodyConfig, wave: number,
): void {
  const scarfW = 10;
  for (let x = -scarfW; x <= scarfW; x++) {
    const sway = Math.sin(x * 0.4 + wave * 2) * 2;
    for (let dy = -1; dy <= 1; dy++) {
      setPixel(c, cx + x, y + dy + Math.round(sway), config.scarfColor);
    }
  }
  // Dangling end
  for (let dy = 0; dy < 5; dy++) {
    const sway = Math.sin(dy * 0.5 + wave * 3) * 2;
    for (let w = -1; w <= 1; w++) {
      setPixel(c, cx + 4 + w + Math.round(sway), y + 2 + dy, config.scarfColor);
    }
  }
}

function drawHat(c: Canvas, pw: number, cx: number, y: number, config: BodyConfig, wave: number): void {
  const top = y - 10;
  fillRect(c, cx - 5, top, 10, 2, config.hatColor);
  fillRect(c, cx - 3, top + 2, 6, 5, config.hatColor);
  fillRect(c, cx - 7, top + 7, 14, 1.5, config.hatColor);
  // Hat band
  fillRect(c, cx - 7, top + 6, 14, 1.5, config.scarfColor);
}

function drawGlasses(c: Canvas, pw: number, cx: number, y: number, config: BodyConfig): void {
  // Simple glasses — two circles with bridge
  const gy = y - 3;
  const r = 3;
  for (let a = 0; a < Math.PI * 2; a += 0.2) {
    setPixel(c, cx - 4 + Math.cos(a) * r, gy + Math.sin(a) * r, config.glassesColor);
    setPixel(c, cx + 4 + Math.cos(a) * r, gy + Math.sin(a) * r, config.glassesColor);
  }
  // Bridge
  fillRect(c, cx - 1, gy - 0.5, 2, 1, config.glassesColor);
}

function drawBow(c: Canvas, pw: number, cx: number, y: number, config: BodyConfig, rand: Rng): void {
  const by = y - 8;
  fillEllipse(c, cx - 3, by, 3, 2, config.scarfColor);
  fillEllipse(c, cx + 3, by, 3, 2, config.scarfColor);
  fillCircle(c, cx, by, 1.5, config.scarfColor);
}

// ─── RNG ─────────────────────────────────────────────────────

interface Rng {
  (): number;
  (min: number, max: number): number;
}

function createRng(seed: string): Rng {
  let s = hash(seed);
  function rng(min?: number, max?: number): number {
    s = (s * 1664525 + 1013904223) | 0;
    const v = (s >>> 0) / 0xffffffff;
    if (min !== undefined && max !== undefined) {
      return Math.floor(min + v * (max - min + 1));
    }
    return v;
  }
  return rng as Rng;
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

function pick<T>(arr: T[], rand: Rng): T {
  return arr[rand(0, arr.length - 1)]!;
}

// ─── Name generation ────────────────────────────────────────

const BODY_NAMES: Record<string, string> = {
  blob: "Blobby", cat: "Kit", ghost: "Boo", robot: "Beep", bunny: "Hop",
};

const COLOR_NAMES: Record<string, string> = {
  green: "Moss", blue: "Azure", pink: "Rosy", purple: "Plum", orange: "Ember", teal: "Tide",
};

export function generatePetName(template: PetTemplate): string {
  const rand = createRng(Date.now().toString() + Math.random());
  const body = template.body === "random" ? pick(["blob", "cat", "ghost", "robot", "bunny"], rand) : template.body;
  const colors = template.colors === "random" ? pick(Object.keys(COLOR_NAMES), rand) : template.colors;
  return `${COLOR_NAMES[colors] || colors} ${BODY_NAMES[body] || body}`;
}
