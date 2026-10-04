export function startHandwriting(image: string, progress: (message: string) => void) {
  const worker = new Worker(new URL("./handwriting.worker.ts", import.meta.url), { type: "module" });
  let settled = false;
  let rejectJob: (error: Error) => void = () => {};
  let timeout: ReturnType<typeof setTimeout>;
  const stop = () => { clearTimeout(timeout); worker.terminate(); };
  const promise = new Promise<string>((resolve, reject) => {
    rejectJob = reject;
    worker.onmessage = event => {
      if (settled) return;
      if (event.data.type === "progress") progress(event.data.message);
      else if (event.data.type === "result") { settled = true; stop(); resolve(event.data.text); }
      else { settled = true; stop(); reject(new Error("Handwriting reader failed")); }
    };
    worker.onerror = () => { if (!settled) { settled = true; stop(); reject(new Error("Handwriting reader unavailable")); } };
    timeout = setTimeout(() => { if (!settled) { settled = true; stop(); reject(new Error("Handwriting reader timed out")); } }, 300000);
    worker.postMessage({ image });
  });
  return { promise, cancel: () => { if (!settled) { settled = true; stop(); rejectJob(new DOMException("Cancelled", "AbortError")); } } };
}
export interface LineSelection { x: number; y: number; width: number; height: number }
export function selectionBetween(a: { x: number; y: number }, b: { x: number; y: number }): LineSelection {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}
export async function cropHandwritingLine(image: string, selection: LineSelection) {
  const photo = new Image(); photo.src = image; await photo.decode();
  const x = Math.round(selection.x * photo.width), y = Math.round(selection.y * photo.height);
  const width = Math.min(photo.width - x, Math.round(selection.width * photo.width));
  const height = Math.min(photo.height - y, Math.round(selection.height * photo.height));
  if (x < 0 || y < 0 || width < 12 || height < 8 || width < height) throw new Error("Select one horizontal line of handwriting, including all letters.");
  const canvas = document.createElement("canvas"); canvas.width = width + 16; canvas.height = height + 16;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Photo processing unavailable");
  ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(photo, x, y, width, height, 8, 8, width, height);
  return canvas.toDataURL("image/png");
}
