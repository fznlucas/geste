"use client";

/**
 * Pictures uploaded in the admin (digital preview, studio test): resized in the browser to 800 px on
 * the long side and kept as a JPEG data URL in the admin overlay, so every admin page shows them. The
 * store shows them after the next build (Storage upload in Live).
 */
export async function readImage(file: File, maxSide = 800): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image (JPEG, PNG or WebP).");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This image could not be read.");
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale), height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.82), width: bitmap.width || width, height: bitmap.height || height };
}
