import { createWorker, PSM, type Worker as OCRWorker } from "tesseract.js";
import workerUrl from "tesseract.js/dist/worker.min.js?url";
import { cropHandwritingLine, startHandwritingBatch } from "./handwriting";
import { mergeRegions, splitLabelLines, type DetectedLine, type MixedRegion } from "./mixedRegions";
import { prepareDocumentImage } from "./documentImage";

export function startMixedExtraction(image: string, progress: (message: string) => void) {
  let ocr: OCRWorker | undefined;
  let classifier: Worker | undefined;
  let handwriting: ReturnType<typeof startHandwritingBatch> | undefined;
  let settled = false;
  let rejectJob: (reason: Error) => void = () => {};
  const stop = () => { void ocr?.terminate().catch(() => {}); ocr = undefined; classifier?.terminate(); classifier = undefined; handwriting?.cancel(); };
  const promise = new Promise<MixedRegion[]>((resolve, reject) => {
    rejectJob = reject;
    void (async () => {
      try {
        progress("Preparing the document…");
        const photo = new Image(); photo.src = image; await photo.decode();
        const prepared = await prepareDocumentImage(image);
        const preparedPhoto = new Image(); preparedPhoto.src = prepared; await preparedPhoto.decode();
        if (settled) return;
        const scaleX = (preparedPhoto.width - 32) / photo.width, scaleY = (preparedPhoto.height - 32) / photo.height;
        const originalBox = (box: { x0: number; y0: number; x1: number; y1: number }) => ({ x0: Math.max(0, Math.round((box.x0 - 16) / scaleX)), y0: Math.max(0, Math.round((box.y0 - 16) / scaleY)), x1: Math.min(photo.width, Math.round((box.x1 - 16) / scaleX)), y1: Math.min(photo.height, Math.round((box.y1 - 16) / scaleY)) });
        progress("Finding text regions…");
        ocr = await createWorker("eng", 1, { workerPath: new URL(workerUrl, window.location.href).href });
        if (settled) { stop(); return; }
        await ocr.setParameters({ tessedit_pageseg_mode: PSM.AUTO, user_defined_dpi: "300" });
        const { data } = await ocr.recognize(prepared, {}, { blocks: true });
        if (settled) return;
        const lines: DetectedLine[] = splitLabelLines((data.blocks || []).flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines)).map(line => ({ bbox: originalBox(line.bbox), words: line.words.filter(word => /[\p{L}\p{N}]/u.test(word.text)).map(word => ({ ...word, bbox: originalBox(word.bbox) })).filter(word => word.bbox.x1 > word.bbox.x0 && word.bbox.y1 > word.bbox.y0) })).filter(line => line.words.length && line.bbox.x1 - line.bbox.x0 >= 12 && line.bbox.y1 - line.bbox.y0 >= 8));
        await ocr.terminate(); ocr = undefined;
        const count = lines.reduce((total, line) => total + line.words.length, 0);
        if (!count) { settled = true; resolve([]); return; }
        if (count > 500) throw new Error("This page has too much text for the automatic reader. Crop it into smaller sections.");
        classifier = new Worker(new URL("./classifier.worker.ts", import.meta.url), { type: "module" });
        const classification = await new Promise<{ probabilities: number[][]; skipped?: boolean[] }>((accept, fail) => {
          classifier!.onmessage = event => {
            if (event.data.type === "progress") { if (!settled) progress(event.data.message); }
            else if (event.data.type === "result") accept(event.data);
            else fail(new Error("Could not load the text-type detector. Check your connection and retry."));
          };
          classifier!.onerror = () => fail(new Error("The text-type detector is unavailable on this device."));
          classifier!.postMessage({ image, lines, model: new URL(`${import.meta.env.BASE_URL}models/text-type-resnet18.onnx`, window.location.href).href });
        });
        if (settled) return;
        classifier.terminate(); classifier = undefined;
        const regions = mergeRegions(lines, classification.probabilities);
        regions.forEach(region => { if (classification.skipped?.[region.line]) region.omitted = "Possible border, blank area or faint ink; not transcribed."; });
        regions.forEach(region => { if (region.kind === "handwritten" && region.bbox.x1 - region.bbox.x0 <= region.bbox.y1 - region.bbox.y0) region.kind = "uncertain"; });
        const handwritten = regions.filter(region => !region.omitted && region.kind === "handwritten" && region.bbox.x1 - region.bbox.x0 > region.bbox.y1 - region.bbox.y0);
        // Keep uncertain regions on OCR; never replace them with a handwriting guess.
        if (handwritten.length > 30) throw new Error("Too many handwriting regions. Crop the page into smaller sections.");
        if (handwritten.length) {
          const crops: string[] = [];
          for (const region of handwritten) {
            const box = region.bbox;
            for (const pad of [6, 8]) {
              const x = Math.max(0, box.x0 - pad), y = Math.max(0, box.y0 - pad);
              crops.push(await cropHandwritingLine(image, { x: x / photo.width, y: y / photo.height, width: (Math.min(photo.width, box.x1 + pad) - x) / photo.width, height: (Math.min(photo.height, box.y1 + pad) - y) / photo.height }));
            }
            if (settled) return;
          }
          handwriting = startHandwritingBatch(crops, progress);
          const texts = await handwriting.promise;
          handwriting = undefined;
          if (settled) return;
          handwritten.forEach((region, index) => {
            const readings = texts.slice(index * 2, index * 2 + 2);
            region.alternatives = readings;
            const normalized = readings.map(text => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""));
            region.text = normalized[0] && normalized[0] === normalized[1] ? readings[0] : "";
          });
        }
        if (!settled) { settled = true; resolve(regions); }
      } catch (error) { if (!settled) { settled = true; reject(error); } }
      finally { stop(); }
    })();
  });
  const cancel = () => { if (!settled) { settled = true; rejectJob(new DOMException("Cancelled", "AbortError")); } stop(); };
  const timeout = window.setTimeout(cancel, 600000);
  void promise.then(() => window.clearTimeout(timeout), () => window.clearTimeout(timeout));
  return { promise, cancel };
}
