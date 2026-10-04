import { pipeline, RawImage, env } from "@huggingface/transformers";

// One WASM thread works in installed PWAs without cross-origin isolation.
env.allowLocalModels = false;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
}
self.onmessage = async (event: MessageEvent<{ image?: string; images?: string[] }>) => {
  try {
    self.postMessage({ type: "progress", message: "Loading handwriting reader…" });
    const reader = await pipeline("image-to-text", "Xenova/trocr-small-handwritten", {
      dtype: "q8", device: "wasm",
      revision: "b83e356c94a4b67dcb090f09584c10eed7f13d94",
      progress_callback: progress => {
        if (progress.status === "progress") self.postMessage({ type: "progress", message: `Downloading handwriting reader… ${Math.round(progress.progress)}% of current file` });
      },
    });
    try {
      const images = event.data.images || [event.data.image!];
      const texts: string[] = [];
      for (const [index, source] of images.entries()) {
        self.postMessage({ type: "progress", message: `Reading handwriting… ${index + 1} of ${images.length}` });
        const image = await RawImage.fromBlob(await (await fetch(source)).blob());
        const output = await reader(image, { max_new_tokens: 48 });
        const first = output[0];
        const text = Array.isArray(first) ? first[0]?.generated_text : first?.generated_text;
        texts.push(text?.trim() || "");
      }
      self.postMessage({ type: "result", text: texts[0], texts });
    } finally { await reader.dispose(); }
  } catch {
    self.postMessage({ type: "error" });
  }
};
