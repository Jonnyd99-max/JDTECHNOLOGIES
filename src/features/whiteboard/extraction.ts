import { createWorker, PSM, type Worker } from "tesseract.js";
import workerUrl from "tesseract.js/dist/worker.min.js?url";
import { prepareDocumentImage } from "./documentImage";

export type TextLayout = "document" | "form" | "notes" | "block" | "line";
export interface ExtractionCandidate { text: string; confidence: number; source: string }
export function startExtraction(image: string, layout: TextLayout, progress: (message: string) => void, original?: string, compare = true) {
  let worker: Worker | undefined;
  let cancelled = false;
  let settled = false;
  let rejectJob: (reason: Error) => void = () => {};
  const stopWorker = () => { if (worker) { void worker.terminate().catch(() => {}); worker = undefined; } };
  let pass = 1;
  const images = [{ image, source: "Cleaned photo" }, ...(compare && original && original !== image ? [{ image: original, source: "Original photo" }] : [])];
  const promise = new Promise<ExtractionCandidate[]>((resolve, reject) => {
    rejectJob = reject;
    void (async () => {
      try {
        if (layout === "form") {
          progress("Preparing the printed form…");
          const prepared = await prepareDocumentImage(original || image);
          images.splice(0, images.length, { image: prepared, source: "Prepared document" }, ...(compare ? [{ image, source: "Cleaned photo" }] : []));
          if (cancelled || settled) return;
        }
        progress("Loading English text reader…");
        const created = await createWorker("eng", 1, {
          workerPath: new URL(workerUrl, window.location.href).href,
          logger: event => {
            if (!cancelled && !settled) progress(event.status === "recognizing text"
              ? `Reading photo ${pass} of ${images.length}… ${Math.round(event.progress * 100)}%`
              : "Loading English text reader…");
          },
          errorHandler: () => { if (!settled) { settled = true; reject(new Error("OCR failed")); stopWorker(); } },
        });
        worker = created;
        if (cancelled || settled) { stopWorker(); return; }
        const modes = { notes: PSM.SPARSE_TEXT, document: PSM.AUTO, form: PSM.AUTO, block: PSM.SINGLE_BLOCK, line: PSM.SINGLE_LINE };
        await worker.setParameters({ tessedit_pageseg_mode: modes[layout], user_defined_dpi: "300" });
        const results: ExtractionCandidate[] = [];
        for (const input of images) {
          if (cancelled || settled || !worker) return;
          const { data } = await worker.recognize(input.image, { rotateAuto: true });
          results.push({ text: data.text.trim(), confidence: Number.isFinite(data.confidence) ? data.confidence : 0, source: input.source });
          pass++;
        }
        // Prefer the purpose-built document input for forms. Confidence is not accuracy.
        results.sort((a, b) => Number(Boolean(b.text)) - Number(Boolean(a.text)) || (layout === "form" ? 0 : b.confidence - a.confidence));
        if (!cancelled && !settled) { settled = true; resolve(results); }
      } catch (error) {
        if (!settled) { settled = true; reject(error); }
      } finally { stopWorker(); }
    })();
  });
  const cancel = () => {
    cancelled = true;
    if (!settled) { settled = true; rejectJob(new DOMException("Cancelled", "AbortError")); }
    stopWorker();
  };
  const timeout = window.setTimeout(cancel, 120000);
  void promise.then(() => window.clearTimeout(timeout), () => window.clearTimeout(timeout));
  return { promise, cancel };
}
