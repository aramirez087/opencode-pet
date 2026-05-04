import sharp from "sharp";

export interface FrameBuffer {
  data: Buffer;
  width: number;
  height: number;
}

export interface SpritesheetResult {
  frames: FrameBuffer[];
  cols: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
}

export async function parseSpritesheet(
  spritesheetPath: string,
  cols: number,
  rows: number,
): Promise<SpritesheetResult> {
  const image = sharp(spritesheetPath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Could not determine spritesheet dimensions");
  }

  const frameWidth = Math.floor(metadata.width / cols);
  const frameHeight = Math.floor(metadata.height / rows);

  const frames: FrameBuffer[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const left = col * frameWidth;
      const top = row * frameHeight;

      const frameBuffer = await image
        .clone()
        .extract({ left, top, width: frameWidth, height: frameHeight })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      frames.push({
        data: frameBuffer.data,
        width: frameWidth,
        height: frameHeight,
      });
    }
  }

  return { frames, cols, rows, frameWidth, frameHeight };
}

export function detectGrid(
  totalWidth: number,
  totalHeight: number,
  suggestedCols?: number,
  suggestedRows?: number,
  suggestedFrameWidth?: number,
  suggestedFrameHeight?: number,
): { cols: number; rows: number; frameWidth: number; frameHeight: number } {
  if (suggestedCols && suggestedRows) {
    return {
      cols: suggestedCols,
      rows: suggestedRows,
      frameWidth: Math.floor(totalWidth / suggestedCols),
      frameHeight: Math.floor(totalHeight / suggestedRows),
    };
  }

  if (suggestedFrameWidth && suggestedFrameHeight) {
    const cols = Math.floor(totalWidth / suggestedFrameWidth);
    const rows = Math.floor(totalHeight / suggestedFrameHeight);
    if (cols < 1 || rows < 1) {
      throw new Error(
        `Frame size ${suggestedFrameWidth}x${suggestedFrameHeight} is larger than spritesheet ${totalWidth}x${totalHeight}`,
      );
    }
    return {
      cols,
      rows,
      frameWidth: suggestedFrameWidth,
      frameHeight: suggestedFrameHeight,
    };
  }

  const candidates: { cols: number; rows: number; score: number }[] = [];

  for (let grid = 2; grid <= 32; grid++) {
    for (const [c, r] of [
      [grid, grid],
      [grid, grid * 2],
      [grid * 2, grid],
    ] as const) {
      if (c > 32 || r > 32) continue;
      if (totalWidth % c === 0 && totalHeight % r === 0) {
        const fw = totalWidth / c;
        const fh = totalHeight / r;
        if (fw >= 32 && fh >= 32) {
          const frameCount = c * r;
          const score = frameCount >= 32 && frameCount <= 256 ? 2 : frameCount >= 16 && frameCount <= 512 ? 1 : 0;
          candidates.push({ cols: c, rows: r, score });
        }
      }
    }
  }

  // Known Codex spritesheet dimensions: prefer specific grids
  if (totalWidth === 1536 && totalHeight === 1872) {
    // Standard Codex pet spritesheet — 8×8 grid
    return { cols: 8, rows: 8, frameWidth: 192, frameHeight: 234 };
  }

  if (candidates.length === 0) {
    // Fallback: try common grid sizes
    const commonGrids = [8, 12, 16, 4, 6, 10, 20, 24];
    for (const grid of commonGrids) {
      for (const variant of [1, 2] as const) {
        for (const [c, r] of [
          [grid, grid * variant],
          [grid * variant, grid],
          [grid, grid],
        ] as const) {
          if (c > 32 || r > 32 || c < 2 || r < 2) continue;
          if (totalWidth % c === 0 && totalHeight % r === 0) {
            const fw = totalWidth / c;
            const fh = totalHeight / r;
            if (fw >= 16 && fh >= 16) {
              candidates.push({ cols: c, rows: r, score: 0 });
            }
          }
        }
      }
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      `Could not auto-detect grid for ${totalWidth}x${totalHeight}. ` +
        `Please specify --cols and --rows or --frame-width and --frame-height.`,
    );
  }

  candidates.sort((a, b) => b.score - a.score || a.cols * a.rows - b.cols * b.rows);
  const best = candidates[0]!;

  return {
    cols: best.cols,
    rows: best.rows,
    frameWidth: totalWidth / best.cols,
    frameHeight: totalHeight / best.rows,
  };
}
