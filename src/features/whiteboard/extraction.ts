import { createWorker, PSM, type Worker } from "tesseract.js";
import workerUrl from "tesseract.js/dist/worker.min.js?url";

export type TextLayout = "document" | "notes";
export function startExtraction(image: string, layout: TextLayout, progress: (message: string) => void) {
  let worker: Worker | undefined;
  let cancelled = false;
  let settled = false;
  let rejectJob: (reason: Error) => void = () => {};
  const stopWorker = () => { if (worker) { void worker.terminate().catch(() => {}); worker = undefined; } };
  const promise = new Promise<string>((resolve, reject) => {
    rejectJob = reject;
    void (async () => {
      try {
        progress("Loading English text reader…");
        const created = await createWorker("eng", 1, {
          workerPath: new URL(workerUrl, window.location.href).href,
          logger: event => {
            if (!cancelled && !settled) progress(event.status === "recognizing text"
              ? `Reading text… ${Math.round(event.progress * 100)}%`
              : "Loading English text reader…");
          },
          errorHandler: () => { if (!settled) { settled = true; reject(new Error("OCR failed")); stopWorker(); } },
        });
        worker = created;
        if (cancelled || settled) { stopWorker(); return; }
        await worker.setParameters({ tessedit_pageseg_mode: layout === "notes" ? PSM.SPARSE_TEXT : PSM.AUTO });
        const { data } = await worker.recognize(image);
        if (!cancelled && !settled) { settled = true; resolve(data.text.trim()); }
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
