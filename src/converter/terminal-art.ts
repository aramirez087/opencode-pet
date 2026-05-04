export type ColorMode = "truecolor" | "256" | "ansi16" | "mono";

interface RGB {
  r: number;
  g: number;
  b: number;
}

const EMPTY: RGB = { r: -1, g: -1, b: -1 };

export function frameToTerminal(
  frame: { data: Buffer; width: number; height: number },
  outputWidth: number,
  outputHeight: number,
  colorMode: ColorMode,
  transparentBackground: boolean,
): string[] {
  const { data, width, height } = frame;

  const charRows = outputHeight;
  const charCols = outputWidth;
  const pixelRows = charRows * 2; // 2:1 pixel-to-char ratio with half-blocks
  const pixelCols = charCols;

  const scaleX = width / pixelCols;
  const scaleY = height / pixelRows;

  const lines: string[] = [];

  for (let cy = 0; cy < charRows; cy++) {
    let line = "";
    let lastFg: RGB = { r: -1, g: -1, b: -1 };
    let lastBg: RGB = { r: -1, g: -1, b: -1 };

    for (let cx = 0; cx < charCols; cx++) {
      // Sample the top half
      const ty = Math.floor(cy * 2 * scaleY);
      const tH = Math.max(1, Math.floor(scaleY));
      const top = sampleRegion(data, width, height, cx, scaleX, ty, tH);

      // Sample the bottom half
      const by = Math.floor((cy * 2 + 1) * scaleY);
      const bH = Math.max(1, Math.floor(scaleY));
      const bot = sampleRegion(data, width, height, cx, scaleX, by, bH);

      const [char, fg, bg] = pickBlock(top, bot, transparentBackground);

      if (!char) {
        line += emitAnsi("\x1b[0m ", lastFg, lastBg);
        lastFg = { r: -1, g: -1, b: -1 };
        lastBg = { r: -1, g: -1, b: -1 };
        continue;
      }

      const cell = renderCell(char, fg, bg, lastFg, lastBg, colorMode);
      line += cell.text;
      lastFg = cell.fg;
      lastBg = cell.bg;
    }

    line += "\x1b[0m";
    lines.push(line);
  }

  return lines;
}

function sampleRegion(
  data: Buffer,
  imgWidth: number,
  imgHeight: number,
  cx: number,
  scaleX: number,
  sy: number,
  sH: number,
): RGB {
  const sx = Math.floor(cx * scaleX);
  const sW = Math.max(1, Math.floor(scaleX));
  const ex = Math.min(imgWidth, sx + sW);
  const ey = Math.min(imgHeight, sy + sH);

  let r = 0;
  let g = 0;
  let b = 0;
  let totalAlpha = 0;
  let count = 0;

  for (let y = Math.max(0, sy); y < ey; y++) {
    for (let x = Math.max(0, sx); x < ex; x++) {
      const idx = (y * imgWidth + x) * 4;
      if (idx + 3 >= data.length) continue;
      const alpha = data[idx + 3]!;
      if (alpha > 0) {
        r += data[idx]! * alpha;
        g += data[idx + 1]! * alpha;
        b += data[idx + 2]! * alpha;
        totalAlpha += alpha;
      }
      count++;
    }
  }

  if (totalAlpha === 0) return EMPTY;
  return {
    r: Math.min(255, Math.round(r / totalAlpha)),
    g: Math.min(255, Math.round(g / totalAlpha)),
    b: Math.min(255, Math.round(b / totalAlpha)),
  };
}

function pickBlock(
  top: RGB,
  bot: RGB,
  transparent: boolean,
): [string | null, RGB, RGB] {
  const topEmpty = top.r === -1;
  const botEmpty = bot.r === -1;

  if (topEmpty && botEmpty) {
    return transparent ? [null, EMPTY, EMPTY] : [" ", top, bot];
  }

  if (!topEmpty && !botEmpty) {
    if (colorDist(top, bot) < 40) {
      return ["█", top, EMPTY];
    }
    // ▀: fg fills top, bg fills bottom
    return ["▀", top, bot];
  }

  if (!topEmpty && botEmpty) {
    if (transparent) {
      // ▀ with fg=top color, bg=transparent (send bg reset)
      return ["▀", top, EMPTY];
    }
    return ["▀", top, { r: 0, g: 0, b: 0 }];
  }

  // topEmpty && !botEmpty
  if (transparent) {
    return ["▄", bot, EMPTY];
  }
  return ["▄", bot, { r: 0, g: 0, b: 0 }];
}

function renderCell(
  char: string,
  fg: RGB,
  bg: RGB,
  lastFg: RGB,
  lastBg: RGB,
  mode: ColorMode,
): { text: string; fg: RGB; bg: RGB } {
  const parts: string[] = [];
  let newFg = fg;
  let newBg = bg;

  // Emit foreground ANSI if changed
  if (fg.r !== -1) {
    if (fg.r !== lastFg.r || fg.g !== lastFg.g || fg.b !== lastFg.b) {
      parts.push(fgCode(fg, mode));
    }
  } else if (lastFg.r !== -1) {
    parts.push("\x1b[39m");
    newFg = EMPTY;
  }

  // Emit background ANSI if changed
  if (bg.r !== -1) {
    if (bg.r !== lastBg.r || bg.g !== lastBg.g || bg.b !== lastBg.b) {
      parts.push(bgCode(bg, mode));
    }
  } else if (lastBg.r !== -1) {
    parts.push("\x1b[49m");
    newBg = EMPTY;
  }

  parts.push(char);

  return { text: parts.join(""), fg: newFg, bg: newBg };
}

function emitAnsi(
  text: string,
  lastFg: RGB,
  lastBg: RGB,
): string {
  let out = "";
  const needReset = lastFg.r !== -1 || lastBg.r !== -1;
  if (needReset && text.startsWith("\x1b[0m")) {
    out += text;
  } else if (needReset) {
    out += "\x1b[0m" + text;
  } else {
    out += text;
  }
  return out;
}

function fgCode(rgb: RGB, mode: ColorMode): string {
  switch (mode) {
    case "truecolor":
      return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`;
    case "256":
      return `\x1b[38;5;${to256(rgb)}m`;
    case "ansi16":
      return `\x1b[${to16fg(rgb)}m`;
    case "mono":
      return luminance(rgb) > 128 ? "\x1b[97m" : "\x1b[30m";
  }
}

function bgCode(rgb: RGB, mode: ColorMode): string {
  switch (mode) {
    case "truecolor":
      return `\x1b[48;2;${rgb.r};${rgb.g};${rgb.b}m`;
    case "256":
      return `\x1b[48;5;${to256(rgb)}m`;
    case "ansi16":
      return `\x1b[${to16bg(rgb)}m`;
    case "mono":
      return "";
  }
}

function to256(rgb: RGB): number {
  if (rgb.r === rgb.g && rgb.g === rgb.b) {
    if (rgb.r < 8) return 16;
    if (rgb.r > 248) return 231;
    return Math.round((rgb.r - 8) / 10) + 232;
  }
  const r = Math.min(5, Math.round((rgb.r / 255) * 5));
  const g = Math.min(5, Math.round((rgb.g / 255) * 5));
  const b = Math.min(5, Math.round((rgb.b / 255) * 5));
  return 16 + 36 * r + 6 * g + b;
}

function to16fg(rgb: RGB): number {
  const ansi: RGB[] = [
    { r: 0, g: 0, b: 0 },       { r: 128, g: 0, b: 0 },
    { r: 0, g: 128, b: 0 },     { r: 128, g: 128, b: 0 },
    { r: 0, g: 0, b: 128 },     { r: 128, g: 0, b: 128 },
    { r: 0, g: 128, b: 128 },   { r: 192, g: 192, b: 192 },
    { r: 128, g: 128, b: 128 }, { r: 255, g: 0, b: 0 },
    { r: 0, g: 255, b: 0 },     { r: 255, g: 255, b: 0 },
    { r: 0, g: 0, b: 255 },     { r: 255, g: 0, b: 255 },
    { r: 0, g: 255, b: 255 },   { r: 255, g: 255, b: 255 },
  ];
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < 16; i++) {
    const d = colorDist(rgb, ansi[i]!);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return 30 + best + (best >= 8 ? 52 : 0);
}

function to16bg(rgb: RGB): number {
  const ansi: RGB[] = [
    { r: 0, g: 0, b: 0 },       { r: 128, g: 0, b: 0 },
    { r: 0, g: 128, b: 0 },     { r: 128, g: 128, b: 0 },
    { r: 0, g: 0, b: 128 },     { r: 128, g: 0, b: 128 },
    { r: 0, g: 128, b: 128 },   { r: 192, g: 192, b: 192 },
    { r: 128, g: 128, b: 128 }, { r: 255, g: 0, b: 0 },
    { r: 0, g: 255, b: 0 },     { r: 255, g: 255, b: 0 },
    { r: 0, g: 0, b: 255 },     { r: 255, g: 0, b: 255 },
    { r: 0, g: 255, b: 255 },   { r: 255, g: 255, b: 255 },
  ];
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < 16; i++) {
    const d = colorDist(rgb, ansi[i]!);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return 40 + best + (best >= 8 ? 52 : 0);
}

function colorDist(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function luminance(rgb: RGB): number {
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}
