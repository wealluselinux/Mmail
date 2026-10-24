"use client";

import { hexFromArgb, QuantizerCelebi, Score } from "@material/material-color-utilities";

/**
 * Picks the most fitting accent colors from an image, best first. This is the
 * same approach Android uses to color the system from a wallpaper: quantize the
 * pixels, then score the colors for how good they look as an accent.
 */
export function extractPalette(canvas: HTMLCanvasElement, count = 5): string[] {
  // Work on a small copy so this stays fast on large wallpapers.
  const size = 128;
  const scale = Math.min(1, size / Math.max(canvas.width, canvas.height));
  const w = Math.max(1, Math.round(canvas.width * scale));
  const h = Math.max(1, Math.round(canvas.height * scale));

  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(canvas, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const pixels: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 255) continue;
    pixels.push((((255 << 24) | (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]) >>> 0));
  }
  if (pixels.length === 0) return [];

  const quantized = QuantizerCelebi.quantize(pixels, 128);
  return Score.score(quantized, { desired: count }).map((argb) => hexFromArgb(argb).toLowerCase());
}

/**
 * Resizes and re-encodes an image file as a JPEG small enough to store.
 * Re-encoding also strips any metadata (location, camera) from photos.
 */
export async function prepareWallpaper(
  file: File,
  maxBytes = 1_400_000,
): Promise<{ blob: Blob; canvas: HTMLCanvasElement }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();

    let maxDim = 1920;
    let quality = 0.85;
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= maxBytes) return { blob, canvas };
      // Still too big: shrink and compress a little more, then try again.
      maxDim = Math.round(maxDim * 0.8);
      quality = Math.max(0.6, quality - 0.06);
    }
    throw new Error("too big");
  } finally {
    URL.revokeObjectURL(url);
  }
}
