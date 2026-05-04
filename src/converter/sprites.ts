import { CONVERTER_VERSION, PET_HEIGHT, PET_WIDTH } from "../types.js";
import type { OpenCodePetManifest } from "../types.js";

// A curated sprite is hand-authored, not generated from pixel circles.
// Each frame is a multi-line string. Glyphs in `accents` get a different
// color from the body `fg`. Spaces are transparent (no ANSI emitted).
export interface SpriteDef {
  id: string;
  displayName: string;
  description: string;
  fg: string;
  accents?: Record<string, string>;
  frames: string[];
}

const FACE_ACCENT_DARK = "#1f2937";
const FACE_ACCENT_WHITE = "#fafafa";
const BLUSH = "#fb7185";

export const SPRITES: SpriteDef[] = [
  {
    id: "mochi-cat",
    displayName: "Mochi Cat",
    description: "A pillowy orange tabby with twitchy ears.",
    fg: "#fb923c",
    accents: {
      o: FACE_ACCENT_DARK, O: FACE_ACCENT_DARK, "^": FACE_ACCENT_DARK,
      "-": FACE_ACCENT_DARK, w: FACE_ACCENT_DARK, v: FACE_ACCENT_DARK,
      "·": BLUSH,
    },
    frames: [
      [
        " ╱▔╲    ╱▔╲ ",
        " █  ▀▀▀▀  █ ",
        " █ o    o █ ",
        " █·   v   ·█",
        "  ▀▀▀▀▀▀▀▀  ",
      ].join("\n"),
      [
        " ╱▔╲    ╱▔╲ ",
        " █  ▀▀▀▀  █ ",
        " █ -    - █ ",
        " █·   v   ·█",
        "  ▀▀▀▀▀▀▀▀  ",
      ].join("\n"),
      [
        " ╱▔╲    ╱▔╲ ",
        " █  ▀▀▀▀  █ ",
        " █ ^    ^ █ ",
        " █·   w   ·█",
        "  ▀▀▀▀▀▀▀▀  ",
      ].join("\n"),
    ],
  },
  {
    id: "ember-fox",
    displayName: "Ember Fox",
    description: "A clever little fox with a flame-tipped tail.",
    fg: "#f97316",
    accents: {
      o: FACE_ACCENT_DARK, "-": FACE_ACCENT_DARK, "^": FACE_ACCENT_DARK,
      v: FACE_ACCENT_DARK, w: FACE_ACCENT_DARK,
      "*": "#fde047", "'": "#fde047",
    },
    frames: [
      [
        " ╱╲      ╱╲ ",
        "▐  ▀▀▀▀▀▀  ▌",
        "▐  o    o  ▌",
        " ▐    v    ▌",
        "  ▀▀▀▀▀▀▀▀ *",
      ].join("\n"),
      [
        " ╱╲      ╱╲ ",
        "▐  ▀▀▀▀▀▀  ▌",
        "▐  -    -  ▌",
        " ▐    v    ▌",
        "  ▀▀▀▀▀▀▀▀'*",
      ].join("\n"),
      [
        " ╱╲      ╱╲ ",
        "▐  ▀▀▀▀▀▀  ▌",
        "▐  ^    ^  ▌",
        " ▐    w    ▌",
        "  ▀▀▀▀▀▀▀▀ *",
      ].join("\n"),
    ],
  },
  {
    id: "boo-ghost",
    displayName: "Boo",
    description: "A bashful ghost that flickers when busy.",
    fg: "#e2e8f0",
    accents: {
      o: FACE_ACCENT_DARK, O: FACE_ACCENT_DARK, "-": FACE_ACCENT_DARK,
      "·": BLUSH, "~": "#94a3b8",
    },
    frames: [
      [
        "   ▄████▄   ",
        "  ████████  ",
        "  █ o  o █  ",
        "  █· ~~ ·█  ",
        "   ▀▀ ▀▀▀   ",
      ].join("\n"),
      [
        "   ▄████▄   ",
        "  ████████  ",
        "  █ -  - █  ",
        "  █· ~~ ·█  ",
        "    ▀▀ ▀▀   ",
      ].join("\n"),
      [
        "   ▄████▄   ",
        "  ████████  ",
        "  █ O  O █  ",
        "  █· ~~ ·█  ",
        "   ▀▀▀ ▀▀   ",
      ].join("\n"),
      [
        "   ▄████▄   ",
        "  ████████  ",
        "  █ o  o █  ",
        "  █· ~~ ·█  ",
        "   ▀ ▀▀ ▀   ",
      ].join("\n"),
    ],
  },
  {
    id: "goop-slime",
    displayName: "Goop Slime",
    description: "A jiggly slime with a permanent grin.",
    fg: "#34d399",
    accents: {
      o: FACE_ACCENT_DARK, O: FACE_ACCENT_DARK, "-": FACE_ACCENT_DARK,
      w: FACE_ACCENT_DARK, "·": "#fef3c7",
    },
    frames: [
      [
        "    ▄▄▄▄▄   ",
        "   ███████  ",
        "  █·o   o·█ ",
        "  █   w   █ ",
        "   ▀▀▀▀▀▀▀  ",
      ].join("\n"),
      [
        "   ▄▄▄▄▄▄▄  ",
        "  █████████ ",
        "  █·o   o·█ ",
        "   █  w  █  ",
        "    ▀▀▀▀▀   ",
      ].join("\n"),
      [
        "    ▄▄▄▄▄   ",
        "   ███████  ",
        "  █·O   O·█ ",
        "  █   w   █ ",
        "   ▀▀▀▀▀▀▀  ",
      ].join("\n"),
    ],
  },
  {
    id: "bolt-bot",
    displayName: "Bolt",
    description: "A scrappy little robot with a blinky antenna.",
    fg: "#94a3b8",
    accents: {
      o: "#0ea5e9", O: "#0ea5e9", "*": "#facc15",
      "-": FACE_ACCENT_DARK, "─": FACE_ACCENT_DARK,
    },
    frames: [
      [
        "      *     ",
        "      │     ",
        "   ┌──┴──┐  ",
        "   │ o o │  ",
        "   └──-──┘  ",
      ].join("\n"),
      [
        "            ",
        "      │     ",
        "   ┌──┴──┐  ",
        "   │ O O │  ",
        "   └──-──┘  ",
      ].join("\n"),
      [
        "      *     ",
        "      │     ",
        "   ┌──┴──┐  ",
        "   │ - - │  ",
        "   └──-──┘  ",
      ].join("\n"),
    ],
  },
  {
    id: "embr-dragon",
    displayName: "Embr",
    description: "A baby dragon with smoldering breath.",
    fg: "#a78bfa",
    accents: {
      o: FACE_ACCENT_DARK, "-": FACE_ACCENT_DARK, "^": FACE_ACCENT_DARK,
      "~": "#f97316", "*": "#fde047",
    },
    frames: [
      [
        " ╱▔╲    ╱▔╲ ",
        "▐ █▀▀▀▀▀▀█ ▌",
        "▐ █ o  o █ ▌",
        " ▐█  ^^  █▌ ",
        "  ▀▀▀▀▀▀▀▀  ",
      ].join("\n"),
      [
        " ╱▔╲    ╱▔╲ ",
        "▐ █▀▀▀▀▀▀█ ▌",
        "▐ █ o  o █ ▌",
        " ▐█  ^^  █▌~",
        "  ▀▀▀▀▀▀▀▀ *",
      ].join("\n"),
      [
        " ╱▔╲    ╱▔╲ ",
        "▐ █▀▀▀▀▀▀█ ▌",
        "▐ █ -  - █ ▌",
        " ▐█  ^^  █▌ ",
        "  ▀▀▀▀▀▀▀▀  ",
      ].join("\n"),
    ],
  },
  {
    id: "hop-bunny",
    displayName: "Hop",
    description: "A bouncy bunny with floppy ears.",
    fg: "#f9a8d4",
    accents: {
      o: FACE_ACCENT_DARK, O: FACE_ACCENT_DARK, "-": FACE_ACCENT_DARK,
      "·": BLUSH, w: FACE_ACCENT_DARK,
    },
    frames: [
      [
        "   ▌▏  ▕▐   ",
        "   ▌▏  ▕▐   ",
        "   ▄████▄   ",
        "  █·o  o·█  ",
        "  █  w   █  ",
        "   ▀▀▀▀▀▀   ",
      ].join("\n"),
      [
        "   ▌▏  ▕▐   ",
        "   ▌▏  ▕▐   ",
        "   ▄████▄   ",
        "  █·-  -·█  ",
        "  █  w   █  ",
        "   ▀▀▀▀▀▀   ",
      ].join("\n"),
      [
        "  ▏▌    ▐▕  ",
        "   ▌▏  ▕▐   ",
        "   ▄████▄   ",
        "  █·o  o·█  ",
        "  █  w   █  ",
        "   ▀▀▀▀▀▀   ",
      ].join("\n"),
    ],
  },
  {
    id: "inky-octo",
    displayName: "Inky",
    description: "A pensive octopus with curling tentacles.",
    fg: "#c084fc",
    accents: {
      o: FACE_ACCENT_DARK, "-": FACE_ACCENT_DARK, "·": BLUSH,
      v: FACE_ACCENT_DARK,
    },
    frames: [
      [
        "    ▄▄▄▄    ",
        "   ██████   ",
        "  █·o  o·█  ",
        "  █   v  █  ",
        "  ╲╱╲╱╲╱╲╱  ",
      ].join("\n"),
      [
        "    ▄▄▄▄    ",
        "   ██████   ",
        "  █·-  -·█  ",
        "  █   v  █  ",
        "  ╲╱╲╱╲╱╲╱  ",
      ].join("\n"),
      [
        "    ▄▄▄▄    ",
        "   ██████   ",
        "  █·o  o·█  ",
        "  █   v  █  ",
        "  ╱╲╱╲╱╲╱╲  ",
      ].join("\n"),
    ],
  },
  {
    id: "tux-penguin",
    displayName: "Tux",
    description: "A dapper little penguin in a tuxedo.",
    fg: "#1e293b",
    accents: {
      o: FACE_ACCENT_WHITE, O: FACE_ACCENT_WHITE, "-": FACE_ACCENT_WHITE,
      "█": "#1e293b", "▀": "#1e293b", "▄": "#1e293b",
      "·": "#fafafa", v: "#fb923c", "/": "#fb923c", "\\": "#fb923c",
    },
    frames: [
      [
        "    ▄▄▄▄    ",
        "   ██████   ",
        "   █oOOo█   ",
        "  █·····█  ",
        "    ▀v▀     ",
        "   /    \\   ",
      ].join("\n"),
      [
        "    ▄▄▄▄    ",
        "   ██████   ",
        "   █-OO-█   ",
        "  █·····█  ",
        "    ▀v▀     ",
        "   /    \\   ",
      ].join("\n"),
      [
        "    ▄▄▄▄    ",
        "   ██████   ",
        "   █oOOo█   ",
        "  █·····█  ",
        "    ▀v▀     ",
        "  /      \\  ",
      ].join("\n"),
    ],
  },
  {
    id: "spore-shroom",
    displayName: "Spore",
    description: "A speckled mushroom companion.",
    fg: "#dc2626",
    accents: {
      "·": "#fafafa", "°": "#fafafa",
      "│": "#fef3c7", "║": "#fef3c7",
      o: FACE_ACCENT_DARK, "-": FACE_ACCENT_DARK, w: FACE_ACCENT_DARK,
    },
    frames: [
      [
        "   ▄▄▄▄▄▄   ",
        "  █°·· °·█  ",
        "  █·· °··█  ",
        "   ║o  o║   ",
        "   ║  w ║   ",
        "    ▀▀▀▀    ",
      ].join("\n"),
      [
        "   ▄▄▄▄▄▄   ",
        "  █°·· °·█  ",
        "  █·· °··█  ",
        "   ║-  -║   ",
        "   ║  w ║   ",
        "    ▀▀▀▀    ",
      ].join("\n"),
      [
        "   ▄▄▄▄▄▄   ",
        "  █°·· °·█  ",
        "  █·· °··█  ",
        "   ║o  o║   ",
        "   ║  o ║   ",
        "    ▀▀▀▀    ",
      ].join("\n"),
    ],
  },
];

// Render a single frame string into ANSI-coded lines that match the
// existing OpenCodePetManifest format (one ANSI string per row, padded to
// PET_WIDTH visible glyphs, padded to PET_HEIGHT rows).
function renderFrame(sprite: SpriteDef, frame: string): string[] {
  const rawRows = frame.split("\n");
  const padded = padFrame(rawRows, PET_WIDTH, PET_HEIGHT);

  return padded.map((row) => {
    let out = "";
    let lastColor: string | null = null;
    for (const ch of [...row]) {
      if (ch === " ") {
        if (lastColor !== null) {
          out += "\x1b[0m";
          lastColor = null;
        }
        out += " ";
        continue;
      }
      const color = sprite.accents?.[ch] ?? sprite.fg;
      if (color !== lastColor) {
        out += fgEscape(color);
        lastColor = color;
      }
      out += ch;
    }
    if (lastColor !== null) out += "\x1b[0m";
    return out;
  });
}

function padFrame(rows: string[], width: number, height: number): string[] {
  // Truncate or pad each row to `width` visible glyphs.
  const padded = rows.map((row) => {
    const chars = [...row];
    if (chars.length >= width) return chars.slice(0, width).join("");
    const left = Math.floor((width - chars.length) / 2);
    const right = width - chars.length - left;
    return " ".repeat(left) + row + " ".repeat(right);
  });

  // Center vertically inside `height`.
  if (padded.length >= height) return padded.slice(0, height);
  const blank = " ".repeat(width);
  const top = Math.floor((height - padded.length) / 2);
  const bottom = height - padded.length - top;
  return [
    ...Array.from({ length: top }, () => blank),
    ...padded,
    ...Array.from({ length: bottom }, () => blank),
  ];
}

function fgEscape(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `\x1b[38;2;${r};${g};${b}m`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace(/^#/, "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function spriteToManifest(sprite: SpriteDef): OpenCodePetManifest {
  const frames = sprite.frames.map((f) => renderFrame(sprite, f));
  return {
    id: sprite.id,
    displayName: sprite.displayName,
    description: sprite.description,
    source: "codex",
    frames,
    frameCount: frames.length,
    cols: 0,
    rows: 0,
    convertedAt: new Date().toISOString(),
    converterVersion: CONVERTER_VERSION,
  };
}

export function findSprite(id: string): SpriteDef | undefined {
  return SPRITES.find((s) => s.id === id);
}

export function pickRandomSprite(rand: () => number = Math.random): SpriteDef {
  return SPRITES[Math.floor(rand() * SPRITES.length)]!;
}
