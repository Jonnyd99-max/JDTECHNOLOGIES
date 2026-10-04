import { InferenceSession, Tensor, env } from "onnxruntime-web/wasm";
import { stableLineKind, type DetectedLine, type Box } from "./mixedRegions";
import { hasTextInk } from "./textInk";
env.wasm.numThreads = 1;
env.wasm.proxy = false;
env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0-dev.20250409-89f8206ba4/dist/";
self.onmessage = async (event: MessageEvent<{ image: string; lines: DetectedLine[]; model: string }>) => {
  let session: InferenceSession | undefined;
  let image: ImageBitmap | undefined;
  try {
    self.postMessage({ type: "progress", message: "Loading printed/handwriting detector…" });
    session = await InferenceSession.create(event.data.model, { executionProviders: ["wasm"] });
    image = await createImageBitmap(await (await fetch(event.data.image)).blob());
    const canvas = new OffscreenCanvas(512, 128);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Image processing unavailable");
    context.imageSmoothingQuality = "high";
    const total = event.data.lines.length;
    const probabilities: number[][] = [];
    const skipped: boolean[] = [];
    let done = 0;
    const classify = async (box: Box, pad: number) => {
      const x = Math.max(0, box.x0 - pad), y = Math.max(0, box.y0 - pad);
      const width = Math.min(image!.width - x, box.x1 - box.x0 + pad * 2);
      const height = Math.min(image!.height - y, box.y1 - box.y0 + pad * 2);
      context.drawImage(image!, x, y, width, height, 0, 0, 512, 128);
      const rgba = context.getImageData(0, 0, 512, 128).data;
      const pixels = new Float32Array(3 * 512 * 128);
      const means = [.485, .456, .406], deviations = [.229, .224, .225];
      for (let i = 0; i < 512 * 128; i++) for (let channel = 0; channel < 3; channel++) pixels[channel * 512 * 128 + i] = (rgba[i * 4 + channel] / 255 - means[channel]) / deviations[channel];
      const input = new Tensor("float32", pixels, [1, 3, 128, 512]);
      const result = await session!.run({ pixels: input });
      const logits = result.logits.data as Float32Array;
      const probability = 1 / (1 + Math.exp(logits[1] - logits[0]));
      input.dispose(); Object.values(result).forEach(tensor => tensor.dispose());
      return probability;
    };
    for (const line of event.data.lines) {
      const b = line.bbox, pad = 6;
      const x = Math.max(0, b.x0 - pad), y = Math.max(0, b.y0 - pad);
      const w = Math.min(image.width - x, b.x1 - b.x0 + pad * 2), h = Math.min(image.height - y, b.y1 - b.y0 + pad * 2);
      const scale = Math.min(1, 1024 / w, 256 / h);
      const inkCanvas = new OffscreenCanvas(Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)));
      const inkContext = inkCanvas.getContext("2d", { willReadFrequently: true });
      if (!inkContext) throw new Error("Image processing unavailable");
      inkContext.drawImage(image, x, y, w, h, 0, 0, inkCanvas.width, inkCanvas.height);
      const usable = hasTextInk(inkContext.getImageData(0, 0, inkCanvas.width, inkCanvas.height).data, inkCanvas.width, inkCanvas.height);
      skipped.push(!usable);
      let probability = .5;
      if (usable) {
        const first = await classify(b, 6), second = await classify(b, 8);
        const kind = stableLineKind(first, second, line.field);
        probability = kind === "printed" ? .01 : kind === "handwritten" ? .99 : .5;
      }
      done++;
      self.postMessage({ type: "progress", message: `Checking printed and handwritten lines… ${done} of ${total}` });
      probabilities.push(line.words.map(() => probability));
    }
    // Do not classify isolated word fragments: this model was trained on lines.
    self.postMessage({ type: "result", probabilities, skipped });
  } catch { self.postMessage({ type: "error" }); }
  finally { image?.close(); await session?.release(); }
};
