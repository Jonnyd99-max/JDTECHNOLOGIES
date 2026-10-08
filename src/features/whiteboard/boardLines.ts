export interface BoardLine {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
}
interface Component {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  area: number;
}
// Geometry only: these are candidate ink lines, never verified transcriptions.
export function detectBoardLines(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  ink: "blue" | "dark" = "blue",
): BoardLine[] {
  const mask = new Uint8Array(width * height);
  const gray = new Uint8Array(mask.length);
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        p = i * 4;
      gray[i] = Math.round(
        0.299 * pixels[p] + 0.587 * pixels[p + 1] + 0.114 * pixels[p + 2],
      );
      row += gray[i];
      integral[(y + 1) * (width + 1) + x + 1] =
        integral[y * (width + 1) + x + 1] + row;
    }
  }
  const radius = Math.max(8, Math.round(width / 70));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        p = i * 4,
        r = pixels[p],
        g = pixels[p + 1],
        b = pixels[p + 2];
      if (r - b > 12 && r - g > 8) continue; // Red bullets and diagrams.
      const x0 = Math.max(0, x - radius),
        x1 = Math.min(width, x + radius + 1),
        y0 = Math.max(0, y - radius),
        y1 = Math.min(height, y + radius + 1),
        stride = width + 1;
      const background =
        (integral[y1 * stride + x1] -
          integral[y0 * stride + x1] -
          integral[y1 * stride + x0] +
          integral[y0 * stride + x0]) /
        ((x1 - x0) * (y1 - y0));
      mask[i] = Number(
        ink === "blue"
          ? b - r > 10 && b >= g && gray[i] < 205
          : gray[i] < background - 32,
      );
    }
  const queue = new Int32Array(mask.length),
    components: Component[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) continue;
    let head = 0,
      tail = 1;
    queue[0] = start;
    mask[start] = 0;
    const component = { x0: width, x1: 0, y0: height, y1: 0, area: 0 };
    while (head < tail) {
      const index = queue[head++],
        x = index % width,
        y = Math.floor(index / width);
      component.x0 = Math.min(component.x0, x);
      component.x1 = Math.max(component.x1, x);
      component.y0 = Math.min(component.y0, y);
      component.y1 = Math.max(component.y1, y);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy,
            next = ny * width + nx;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[next]) {
            mask[next] = 0;
            queue[tail++] = next;
          }
        }
    }
    component.area = tail;
    const w = component.x1 - component.x0 + 1,
      h = component.y1 - component.y0 + 1;
    if (tail >= 6 && h >= 2 && h < height * 0.09 && w / h < 12 && h / w < 18)
      components.push(component);
  }
  const rows: Component[][] = [];
  if (components.length > 2500)
    throw new Error(
      "Too much background detail. Crop closer to the writing and retry.",
    );
  const fit = (row: Component[]) => {
    const n = row.length,
      xs = row.map((c) => (c.x0 + c.x1) / 2),
      ys = row.map((c) => (c.y0 + c.y1) / 2),
      mx = xs.reduce((a, b) => a + b, 0) / n,
      my = ys.reduce((a, b) => a + b, 0) / n;
    const variance = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const slope =
      n > 2 && variance
        ? Math.max(
            -0.18,
            Math.min(
              0.18,
              xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / variance,
            ),
          )
        : 0;
    return { slope, mx, my };
  };
  for (const component of components.sort((a, b) => a.x0 - b.x0)) {
    const h = component.y1 - component.y0 + 1,
      cx = (component.x0 + component.x1) / 2,
      cy = (component.y0 + component.y1) / 2;
    const candidates = rows
      .map((row) => {
        const last = row[row.length - 1],
          rh = Math.max(...row.map((c) => c.y1 - c.y0 + 1)),
          f = fit(row);
        const distance = Math.abs(cy - (f.my + f.slope * (cx - f.mx)));
        return {
          row,
          distance,
          suitable:
            component.x0 - last.x1 < Math.max(h, rh) * 3 &&
            distance < Math.max(h, rh) * 0.75,
        };
      })
      .filter((item) => item.suitable)
      .sort((a, b) => a.distance - b.distance);
    if (candidates.length) candidates[0].row.push(component);
    else rows.push([component]);
  }
  return rows
    .filter((row) => {
      const w =
          Math.max(...row.map((c) => c.x1)) - Math.min(...row.map((c) => c.x0)),
        h =
          Math.max(...row.map((c) => c.y1)) - Math.min(...row.map((c) => c.y0));
      return row.length >= 3 && h >= 6 && w >= width * 0.05 && w > h * 2;
    })
    .map((row) => {
      const padding = 8,
        x0 = Math.max(0, Math.min(...row.map((c) => c.x0)) - padding),
        y0 = Math.max(0, Math.min(...row.map((c) => c.y0)) - padding),
        x1 = Math.min(width, Math.max(...row.map((c) => c.x1)) + padding + 1),
        y1 = Math.min(height, Math.max(...row.map((c) => c.y1)) + padding + 1);
      return {
        x: x0 / width,
        y: y0 / height,
        width: (x1 - x0) / width,
        height: (y1 - y0) / height,
        angle: Math.atan(fit(row).slope),
      };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, 30);
}
export async function findBoardLines(
  image: string,
  ink: "blue" | "dark" = "blue",
) {
  const photo = new Image();
  photo.src = image;
  await photo.decode();
  const scale = Math.min(1, 1400 / photo.width, 1800 / photo.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(photo.width * scale);
  canvas.height = Math.round(photo.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing unavailable");
  context.drawImage(photo, 0, 0, canvas.width, canvas.height);
  return detectBoardLines(
    context.getImageData(0, 0, canvas.width, canvas.height).data,
    canvas.width,
    canvas.height,
    ink,
  );
}
