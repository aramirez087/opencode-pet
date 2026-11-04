# 🐾 opencode-pet

<div align="center">
  <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="250" alt="Animated Typing Cat"/>
  <br/>
  <br/>

  > **Your AI model shouldn't have to think alone.**
  > *Adorable animated pets that hang out in your terminal while the model works!* ✨
</div>

Turns Codex spritesheet pets (`pet.json` + `spritesheet.webp`) into OpenCode TUI plugins that render the pet in your terminal whenever the model is processing. Because every coder deserves a little companion while they wait. 💖

## 🚀 Quick start

```bash
# 1. Install
npm install -g opencode-pet

# 2. Generate a pet (or convert your own)
opencode-pet generate

# 3. Register the TUI plugin in ~/.config/opencode/tui.json:
#  { "plugin": ["opencode-pet"] }

# 4. Open OpenCode — your pet animates while the model thinks
```

## 🤔 What is this?

`opencode-pet` adds a small animated pet companion to [OpenCode](https://github.com/opencode-ai/opencode) that appears to the **right of the session prompt** whenever the AI model is busy thinking. It works by:

1. 🐱 **Curating** a library of hand-designed kawaii sprites (cat, crayfish, fox, ghost, slime, robot, dragon, bunny, octopus, penguin, mushroom)
2. 🎨 **Converting** Codex spritesheet pets (`pet.json` + `spritesheet.webp`) into terminal-friendly frames (legacy path)
3. ✨ **Rendering** frames in the OpenCode TUI using Unicode block characters (`▀▄█`) with full ANSI color support
4. 💫 **Animating** in sync with the model's busy/idle state

The pet renders inside a fixed 16×6 cell box with overflow clipping so it always fits cleanly next to the prompt — no wrapping or doubling. A bundled curated fallback pet ships with the plugin so you see something adorable immediately.

## 🐾 Available pets

| Pet | Vibe |
|-----|------|
| 🐱 Mochi Cat | Chill, observant, always watching your code |
| 🦞 Cray | A snappy orange crayfish with a taste for clean code |
| 🦊 Pixel Fox | Sly and curious, loves a good algorithm |
| 👻 Tiny Ghost | Boo! Just floating by, no harm intended |
| 🍡 Blobby Slime | Wobbly, cheerful, loves terminal colors |
| 🤖 Retro Bot | Beep boop. You're doing great. |
| 🐉 Mini Dragon | Tiny flames, big dreams |
| 🐰 Bunny | Soft ears, faster than your build times |
| 🐙 Octopus | Many hands, all typing at once |
| 🐧 Penguin | Slides through your terminal with style |
| 🍄 Shroom | Fungi friends don't lie — your code is fine |

Or generate a random pet with `opencode-pet generate`!

## 🛠️ CLI reference

| Command | Description |
|---------|-------------|
| `opencode-pet sprites` | List bundled curated sprites |
| `opencode-pet install <id>` | Install a curated sprite as a pet |
| `opencode-pet generate` | Procedurally generate a random pet |
| `opencode-pet convert <path>` | Convert a Codex pet spritesheet |
| `opencode-pet list` | List installed pets |
| `opencode-pet preview <id>` | Preview a pet in your terminal |
| `opencode-pet remove <id>` | Remove a pet |

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

## 🔌 Plugin setup

`opencode-pet` is an OpenCode **TUI plugin** — it renders inside the terminal UI. TUI plugins are registered in OpenCode's `tui.json`, **not** `opencode.json`. (`opencode.json`'s `plugin` array is for server-side plugins; a TUI-only plugin placed there fails to load with `Cannot find module '@opentui/solid'`.)

### Recommended — by name in `tui.json`

Add the plugin to `~/.config/opencode/tui.json` (global) or `.opencode/tui.json` (project-scoped):

```jsonc
{
  "plugin": ["opencode-pet"]
}
```

OpenCode resolves the name from npm and loads it as a TUI plugin. Re-launch OpenCode to pick up the change.

> You still need `npm install -g opencode-pet` for the `opencode-pet` **CLI** (generating/converting pets). The plugin itself is fetched by OpenCode from the name above.

### Local development

To run a local build, point `tui.json` at a directory laid out like an install **without** a `node_modules` that contains `solid-js` or `@opentui/solid`:

```jsonc
{
  "plugin": ["file:/absolute/path/to/built-plugin-dir"]
}
```

> **Important:** do not point `tui.json` directly at a cloned repo. OpenCode provides `solid-js`, `@opentui/solid`, and `@opentui/core` to the plugin at runtime; if the repo's `node_modules` contains its own copies they shadow OpenCode's, creating a second `solid-js` instance. The plugin then registers and runs but renders **nothing** (no error). Build, then load from a clean staging directory (`dist` + `assets` + `package.json`, no `node_modules`).

## 💬 Slash commands

| Command | What it does |
|---------|--------------|
| `/pet` | Open the pet picker to switch active pet |
| `/pet-generate` | Procedurally generate a new pet |
| `/pet-remove` | Open a picker to delete an installed pet |
| `/pet-debug` | Show diagnostic info (pet count, active id, KV status) |

## 🏗️ Architecture

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

## ⚙️ How the converter works

1. **Grid detection** — Auto-detects the spritesheet grid (e.g., 8×8 for standard Codex format). Override with `--cols`/`--rows`.
2. **Frame extraction** — Uses Sharp to slice each frame from the spritesheet.
3. **Downscaling** — Resamples each frame to the target output size using area averaging with alpha compositing.
4. **Terminal rendering** — Each 2×1 pixel block becomes a single terminal character cell:
   - Both pixels filled → `█` (full block)
   - Top filled, bottom empty → `▀` (upper half block)
   - Top empty, bottom filled → `▄` (lower half block)
   - Both empty → ` ` (space, transparent)
5. **Coloring** — Each cell gets ANSI escape codes in the selected color mode. Adjacent cells with the same colors reuse existing codes to minimize output size.

## 🥺 Why pets?

Because waiting for an AI to think shouldn't feel like staring at an empty screen. A pet gives you a tiny visual cue that something is happening, and maybe a smile while you wait. 🐾

## 📋 Requirements

- **Node.js** >= 20.9 (for CLI)
- **OpenCode** >= 1.18.0 (for plugin)

## 📄 License

MIT
