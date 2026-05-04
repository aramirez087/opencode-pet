# opencode-pet

**Bring Codex pets to OpenCode** — animated terminal companions that appear while models think.

Turns Codex spritesheet pets (`pet.json` + `spritesheet.webp`) into OpenCode TUI plugins that render the pet in your terminal whenever the model is processing.

## How it works

1. **Convert** a Codex pet spritesheet to terminal-ready frames
2. **Install** the plugin in OpenCode
3. **Watch** your pet animate while the model thinks

The converter slices the spritesheet into individual frames, downscales each to a terminal-friendly size, and renders them using Unicode half-block characters (`▀▄█`) with ANSI truecolor support. The plugin listens for `session.status` events in OpenCode and animates the pet whenever the model is busy.

## Install

```bash
npm install -g opencode-pet
```

## CLI Usage

### Convert a Codex pet

```bash
opencode-pet convert ~/.codex/pets/green-desk-buddy
```

Options:

| Flag | Default | Description |
|------|---------|-------------|
| `--output`, `-o` | `~/.opencode/pets` | Output directory |
| `--cols` | auto | Grid columns in spritesheet |
| `--rows` | auto | Grid rows in spritesheet |
| `--frame-width` | auto | Frame width in pixels |
| `--frame-height` | auto | Frame height in pixels |
| `--output-width` | `40` | Terminal output width (chars) |
| `--output-height` | `20` | Terminal output height (chars) |
| `--color`, `-c` | `truecolor` | Color mode: `truecolor`, `256`, `ansi16`, `mono` |
| `--name` | from pet.json | Override pet ID |
| `--force`, `-f` | — | Overwrite existing pet |
| `--fps` | `10` | Animation frames per second |

### List installed pets

```bash
opencode-pet list
```

### Preview a pet

```bash
opencode-pet preview green-desk-buddy --fps 10 --loop 3
```

### Remove a pet

```bash
opencode-pet remove green-desk-buddy
```

## Plugin Setup

Pick whichever install path fits your situation. Edit `~/.config/opencode/opencode.json` (or `.opencode/opencode.json` for project-scoped install):

### 1. Local development (recommended while iterating)

```jsonc
{
  "plugin": ["file:/absolute/path/to/opencode-pet"]
}
```

OpenCode loads the plugin directly from your working tree via Bun. Re-launch OpenCode to pick up changes.

### 2. Symlink into the OpenCode plugins folder

```bash
ln -s /absolute/path/to/opencode-pet ~/.config/opencode/plugins/opencode-pet
```

OpenCode auto-discovers any plugin in `~/.config/opencode/plugins/`. No config edit needed.

### 3. From npm (after the package is published)

```jsonc
{
  "plugin": ["opencode-pet"]
}
```

> The `opencode-pet` package is **not on npm yet**. Use option 1 or 2 until it is.

After install, run OpenCode and submit any prompt — the pet animates above the prompt area while the model is busy. A bundled fallback pet ships with the plugin so you see something even before generating or converting your own.

### Slash commands

| Command | What it does |
|---------|--------------|
| `/pet` | Open the pet picker to switch active pet |
| `/pet-generate` | Procedurally generate a new pet |
| `/pet-debug` | Toast diagnostic info: count of installed pets, active id, kv readiness, last error |

## Pet format

Codex pets live at `~/.codex/pets/<id>/` with:

```
pet.json          → { id, displayName, description, spritesheetPath }
spritesheet.webp  → atlas image (grid of frames)
```

After conversion, OpenCode pets live at `~/.opencode/pets/<id>/`:

```
pet.json          → { id, frames: string[][], frameCount, ... }
```

Each frame is an array of ANSI-colored terminal strings (one per line), ready for direct rendering.

## How the converter works

1. **Grid detection**: Auto-detects the spritesheet grid (e.g., 8×8 for the standard 1536×1872 Codex format). Override with `--cols`/`--rows`.

2. **Frame extraction**: Uses Sharp to slice each frame from the spritesheet.

3. **Downscaling**: Resamples each frame to the target output size using area averaging with alpha compositing.

4. **Terminal rendering**: Each 2×1 pixel block in the downscaled frame is converted to a single terminal character cell:
   - Both pixels filled → `█` (full block)
   - Top filled, bottom empty → `▀` (upper half block)
   - Top empty, bottom filled → `▄` (lower half block)
   - Both empty → ` ` (space, transparent)

5. **Coloring**: Each cell gets foreground/background ANSI escape codes in the selected color mode (truecolor, 256, ansi16, or mono). Adjacent cells with the same colors reuse the existing escape codes to minimize output size.

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
├── dist/                       → Compiled output
└── package.json
```

## Requirements

- **Node.js** >= 18 (for CLI)
- **OpenCode** >= 1.14.0 (for plugin)
- **Sharp** (auto-installed as dependency)

## License

MIT
