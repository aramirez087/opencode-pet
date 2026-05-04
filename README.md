# opencode-pet

> **Bring Codex pets to OpenCode** — animated terminal companions that appear while models think.

Turns Codex spritesheet pets (`pet.json` + `spritesheet.webp`) into OpenCode TUI plugins that render the pet in your terminal whenever the model is processing.

## Quick start

```bash
# 1. Install
npm install -g opencode-pet

# 2. Generate a pet (or convert your own)
opencode-pet generate

# 3. Point OpenCode at the plugin
# Edit ~/.config/opencode/opencode.json:
#   "plugin": ["file:/absolute/path/to/opencode-pet"]

# 4. Open OpenCode — your pet animates while the model thinks
```

## What is this?

`opencode-pet` adds a small animated pet companion to [OpenCode](https://github.com/opencode-ai/opencode) that appears above the prompt area whenever the AI model is busy thinking. It works by:

1. **Converting** Codex spritesheet pets (`pet.json` + `spritesheet.webp`) into terminal-friendly frames
2. **Rendering** those frames in the OpenCode TUI using Unicode block characters (`▀▄█`) with full ANSI color support
3. **Animating** the frames in sync with the model's busy/idle state

A bundled fallback pet ships with the plugin so you see something immediately, even before generating or converting your own pet.

## CLI reference

| Command | Description |
|---------|-------------|
| `opencode-pet convert <path>` | Convert a Codex pet spritesheet |
| `opencode-pet list` | List installed pets |
| `opencode-pet preview <id>` | Preview a pet in your terminal |
| `opencode-pet remove <id>` | Remove a pet |
| `opencode-pet generate` | Procedurally generate a random pet |

### Convert flags

| Flag | Default | Description |
|------|---------|-------------|
| `-o, --output` | `~/.opencode/pets` | Output directory |
| `--cols` | auto | Grid columns in spritesheet |
| `--rows` | auto | Grid rows in spritesheet |
| `--output-width` | `40` | Terminal output width (chars) |
| `--output-height` | `20` | Terminal output height (chars) |
| `-c, --color` | `truecolor` | Color mode: `truecolor`, `256`, `ansi16`, `mono` |
| `--name` | from pet.json | Override pet ID |
| `-f, --force` | — | Overwrite existing pet |
| `--fps` | `10` | Animation frames per second |

## Plugin setup

Add the plugin to your OpenCode config at `~/.config/opencode/opencode.json` (or `.opencode/opencode.json` for project-scoped install):

### Option 1 — Symlink (recommended)

```bash
ln -s /absolute/path/to/opencode-pet ~/.config/opencode/plugins/opencode-pet
```

OpenCode auto-discovers plugins in `~/.config/opencode/plugins/`. No config edit needed.

### Option 2 — Direct path

```jsonc
{
  "plugin": ["file:/absolute/path/to/opencode-pet"]
}
```

Re-launch OpenCode to pick up the change.

### Option 3 — From npm (future)

```jsonc
{
  "plugin": ["opencode-pet"]
}
```

> The package is not on npm yet. Use option 1 or 2.

## Slash commands

| Command | What it does |
|---------|--------------|
| `/pet` | Open the pet picker to switch active pet |
| `/pet-generate` | Procedurally generate a new pet |
| `/pet-debug` | Show diagnostic info (pet count, active id, KV status) |

## Architecture

```
opencode-pet/
├── src/
│   ├── cli/index.ts            → CLI entry point
│   ├── converter/
│   │   ├── index.ts            → Conversion orchestrator
│   │   ├── spritesheet.ts      → Grid detection + frame extraction
│   │   └── terminal-art.ts     → Frame → ANSI block character conversion
│   ├── plugin/
│   │   ├── index.tsx           → OpenCode TUI plugin entry
│   │   └── pet-loader.ts       → Pet manifest loading + KV storage
│   └── types.ts                → Shared type definitions
├── assets/
│   └── default-pet.json        → Bundled fallback pet
├── scripts/
│   ├── build-plugin.mjs        → Plugin build script
│   └── generate-default-pet.mjs → Default pet generator
├── package.json
└── README.md
```

## How the converter works

1. **Grid detection** — Auto-detects the spritesheet grid (e.g., 8×8 for standard Codex format). Override with `--cols`/`--rows`.
2. **Frame extraction** — Uses Sharp to slice each frame from the spritesheet.
3. **Downscaling** — Resamples each frame to the target output size using area averaging with alpha compositing.
4. **Terminal rendering** — Each 2×1 pixel block becomes a single terminal character cell:
   - Both pixels filled → `█` (full block)
   - Top filled, bottom empty → `▀` (upper half block)
   - Top empty, bottom filled → `▄` (lower half block)
   - Both empty → ` ` (space, transparent)
5. **Coloring** — Each cell gets ANSI escape codes in the selected color mode. Adjacent cells with the same colors reuse existing codes to minimize output size.

## Requirements

- **Node.js** >= 18 (for CLI)
- **OpenCode** >= 1.14.0 (for plugin)

## License

MIT
