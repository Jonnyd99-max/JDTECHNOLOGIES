// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
const { create, recognize, terminate, batch, crop } = vi.hoisted(() => ({ create: vi.fn(), recognize: vi.fn(), terminate: vi.fn(), batch: vi.fn(), crop: vi.fn() }));
vi.mock("tesseract.js", () => ({ createWorker: create, PSM: { SPARSE_TEXT: "11" } }));
vi.mock("./handwriting", () => ({ cropHandwritingLine: crop, startHandwritingBatch: batch }));
import { startMixedExtraction } from "./mixedExtraction";
class Classifier {
  static last: Classifier;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn(); terminate = vi.fn();
  constructor() { Classifier.last = this; }
}
const ocr = { recognize, terminate, setParameters: vi.fn() };
function ready() {
  create.mockResolvedValue(ocr); terminate.mockResolvedValue({}); vi.stubGlobal("Worker", Classifier);
  vi.stubGlobal("Image", class { width = 1000; height = 1000; src = ""; decode = async () => {}; });
  recognize.mockResolvedValue({ data: { blocks: [{ paragraphs: [{ lines: [{ bbox: { x0: 0, y0: 20, x1: 200, y1: 40 }, words: [{ bbox: { x0: 0, y0: 20, x1: 50, y1: 40 }, text: "NAME:", confidence: 90 }, { bbox: { x0: 60, y0: 20, x1: 200, y1: 40 }, text: "OCR guess", confidence: 20 }] }] }] }] } });
  crop.mockResolvedValue("local crop"); batch.mockReturnValue({ promise: Promise.resolve(["Handwriting reading"]), cancel: vi.fn() });
}
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); });
describe("automatic mixed reading", () => {
  it("routes handwriting to its reader while preserving print and its OCR alternative", async () => {
    ready(); const job = startMixedExtraction("local photo", vi.fn());
    await vi.waitFor(() => expect(Classifier.last.postMessage).toHaveBeenCalled());
    Classifier.last.onmessage?.({ data: { type: "result", probabilities: [[.01], [.95]] } });
    const regions = await job.promise;
    expect(regions.map(r => r.text)).toEqual(["NAME:", "Handwriting reading"]);
    expect(regions[1].printedText).toBe("OCR guess");
    expect(batch).toHaveBeenCalledWith(["local crop"], expect.any(Function));
    expect(Classifier.last.terminate).toHaveBeenCalledOnce(); expect(terminate).toHaveBeenCalledOnce();
  });
  it("keeps uncertain text on OCR and does not start the handwriting model", async () => {
    ready(); const job = startMixedExtraction("local photo", vi.fn());
    await vi.waitFor(() => expect(Classifier.last.postMessage).toHaveBeenCalled());
    Classifier.last.onmessage?.({ data: { type: "result", probabilities: [[.01], [.5]] } });
    const regions = await job.promise;
    expect(regions[1].kind).toBe("uncertain"); expect(regions[1].text).toBe("OCR guess"); expect(batch).not.toHaveBeenCalled();
  });
  it("releases OCR that completes loading after cancellation", async () => {
    ready(); let finish!: (worker: typeof ocr) => void;
    create.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const job = startMixedExtraction("local photo", vi.fn());
    const rejected = expect(job.promise).rejects.toMatchObject({ name: "AbortError" });
    job.cancel(); await rejected; finish(ocr); await Promise.resolve(); await Promise.resolve();
    expect(recognize).not.toHaveBeenCalled(); expect(terminate).toHaveBeenCalledOnce();
  });
  it("cancels classifier inference and suppresses a late result", async () => {
    ready(); const job = startMixedExtraction("local photo", vi.fn());
    await vi.waitFor(() => expect(Classifier.last.postMessage).toHaveBeenCalled());
    const rejected = expect(job.promise).rejects.toMatchObject({ name: "AbortError" });
    job.cancel(); Classifier.last.onmessage?.({ data: { type: "result", probabilities: [[.01], [.95]] } });
    await rejected; await Promise.resolve();
    expect(batch).not.toHaveBeenCalled(); expect(Classifier.last.terminate).toHaveBeenCalledOnce();
  });
});
