export function cleanPixels(data: Uint8ClampedArray, width: number, height: number, strength: number, colour: boolean) {
  // Estimate the local paper/board brightness so uneven lighting is corrected.
  const step = 32;
  const cols = Math.ceil(width / step), rows = Math.ceil(height / step);
  const background = new Float32Array(cols * rows);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const cell = Math.floor(y / step) * cols + Math.floor(x / step);
    background[cell] = Math.max(background[cell], data[i], data[i + 1], data[i + 2]);
  }
  const sample = (x: number, y: number) => background[Math.max(0, Math.min(rows - 1, y)) * cols + Math.max(0, Math.min(cols - 1, x))];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const gx = x / step - .5, gy = y / step - .5;
    const bx = Math.floor(gx), by = Math.floor(gy), fx = gx - bx, fy = gy - by;
    const light = Math.max(60, (sample(bx, by) * (1 - fx) + sample(bx + 1, by) * fx) * (1 - fy) + (sample(bx, by + 1) * (1 - fx) + sample(bx + 1, by + 1) * fx) * fy);
    const grey = .299 * data[i] + .587 * data[i + 1] + .114 * data[i + 2];
    for (let c = 0; c < 3; c++) {
      const original = colour ? data[i + c] : grey;
      const normalized = Math.min(255, original * 255 / light);
      const enhanced = Math.max(0, Math.min(255, (normalized - 190) * (1 + strength * 1.5) + 220));
      data[i + c] = original * (1 - strength) + enhanced * strength;
    }
    data[i + 3] = 255;
  }
  return data;
}
