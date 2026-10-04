// Reject blank/shaded crops and long rules before a generative reader sees them.
// Passing this check establishes only text-like ink, not legibility or handwriting.
export function hasTextInk(rgba: Uint8ClampedArray, width: number, height: number) {
  const histogram = new Uint32Array(256);
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = Math.round(.299 * rgba[i * 4] + .587 * rgba[i * 4 + 1] + .114 * rgba[i * 4 + 2]);
    histogram[gray[i]]++;
  }
  const percentile = (fraction: number) => {
    let count = 0;
    for (let i = 0; i < 256; i++) { count += histogram[i]; if (count >= gray.length * fraction) return i; }
    return 255;
  };
  const background = percentile(.9);
  if (background - percentile(.01) < 25) return false;
  const threshold = background * .7;
  const mask = gray.map(value => Number(value < threshold));
  const queue = new Int32Array(gray.length);
  let components = 0, ink = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) continue;
    let head = 0, tail = 1, x0 = width, x1 = 0, y0 = height, y1 = 0;
    queue[0] = start; mask[start] = 0;
    while (head < tail) {
      const index = queue[head++], x = index % width, y = Math.floor(index / width);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const neighbour of [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1]) {
        if (neighbour >= 0 && mask[neighbour]) { mask[neighbour] = 0; queue[tail++] = neighbour; }
      }
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const rule = w / h > 12 || h / w > 12 || (w > width * .7 && h < height * .2);
    if (!rule && tail >= 3 && h >= Math.max(2, height * .12)) { components++; ink += tail; }
  }
  return components >= 3 && ink / gray.length >= .008 && ink / gray.length < .55;
}
