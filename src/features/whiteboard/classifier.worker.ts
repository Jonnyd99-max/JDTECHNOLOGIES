import { InferenceSession, Tensor, env } from "onnxruntime-web/wasm";
import { contextCandidates, regionKind, type DetectedLine, type Box } from "./mixedRegions";
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
    let done = 0;
    const classify = async (box: Box) => {
      const pad = Math.max(6, Math.min(12, Math.round((box.y1 - box.y0) * .2)));
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
      const output: number[] = [];
      const lineProbability = await classify(line.bbox);
      if (lineProbability <= .2 || lineProbability >= .8) {
        // The model was trained on line crops. Split words only for mixed/ambiguous lines.
        line.words.forEach(() => output.push(lineProbability));
      } else {
        for (const word of line.words) output.push(await classify(word.bbox));
      }
      done++;
      self.postMessage({ type: "progress", message: `Checking printed and handwritten lines… ${done} of ${total}` });
      probabilities.push(output);
    }
    // Short fragments are ambiguous; recheck with nearby text of a known type.
    // Only the model can resolve the ambiguity, never OCR confidence alone.
    const contexts = contextCandidates(event.data.lines, probabilities);
    for (const [index, candidate] of contexts.entries()) {
      self.postMessage({ type: "progress", message: `Checking ambiguous regions… ${index + 1} of ${contexts.length}` });
      const probability = await classify(candidate.bbox);
      if (regionKind(probability) === candidate.kind) candidate.indices.forEach(i => { probabilities[candidate.line][i] = probability; });
    }
    self.postMessage({ type: "result", probabilities });
  } catch { self.postMessage({ type: "error" }); }
  finally { image?.close(); await session?.release(); }
};
