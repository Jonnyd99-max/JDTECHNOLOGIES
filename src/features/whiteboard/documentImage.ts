// Normalize the paper without applying the whiteboard colour-cleanup filter.
export function normalizeDocumentPixels(data: Uint8ClampedArray) {
  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(.299 * data[i] + .587 * data[i + 1] + .114 * data[i + 2]);
    histogram[gray]++;
  }
  const pixels = data.length / 4;
  const percentile = (fraction: number) => {
    let count = 0;
    for (let level = 0; level < 256; level++) { count += histogram[level]; if (count >= pixels * fraction) return level; }
    return 255;
  };
  const low = percentile(.01), high = percentile(.99);
  for (let i = 0; i < data.length; i += 4) {
    const gray = .299 * data[i] + .587 * data[i + 1] + .114 * data[i + 2];
    const value = high - low > 20 ? (gray - low) * 255 / (high - low) : gray;
    data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255;
  }
  return data;
}
export async function prepareDocumentImage(image: string) {
  const photo = new Image(); photo.src = image; await photo.decode();
  const canvas = document.createElement("canvas"); canvas.width = photo.width; canvas.height = photo.height;
  const context = canvas.getContext("2d"); if (!context) throw new Error("Image processing unavailable");
  context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(photo, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  normalizeDocumentPixels(pixels.data); context.putImageData(pixels, 0, 0);
  const scale = Math.min(2, 3000 / Math.max(photo.width, photo.height), Math.sqrt(6000000 / (photo.width * photo.height)));
  const output = document.createElement("canvas");
  output.width = Math.round(photo.width * scale) + 32; output.height = Math.round(photo.height * scale) + 32;
  const out = output.getContext("2d"); if (!out) throw new Error("Image processing unavailable");
  out.fillStyle = "white"; out.fillRect(0, 0, output.width, output.height);
  out.imageSmoothingQuality = "high";
  out.drawImage(canvas, 16, 16, output.width - 32, output.height - 32);
  return output.toDataURL("image/png");
}
