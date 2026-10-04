// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
const { create, recognize, terminate, parameters } = vi.hoisted(() => ({ create: vi.fn(), recognize: vi.fn(), terminate: vi.fn(), parameters: vi.fn() }));
vi.mock("tesseract.js", () => ({ createWorker: create, PSM: { AUTO: "3", SPARSE_TEXT: "11", SINGLE_BLOCK: "6", SINGLE_LINE: "7" } }));
vi.mock("./documentImage", () => ({ prepareDocumentImage: vi.fn(async (image: string) => `prepared:${image}`) }));
import { startExtraction } from "./extraction";
const worker = { recognize, terminate, setParameters: parameters };
afterEach(() => { vi.resetAllMocks(); vi.useRealTimers(); });
function ready() { create.mockResolvedValue(worker); parameters.mockResolvedValue({}); terminate.mockResolvedValue({}); }
describe("on-device text extraction", () => {
  it("uses the original form and keeps its prepared reading first even with lower confidence", async () => {
    ready(); recognize.mockResolvedValueOnce({ data: { text: "Complete this form", confidence: 75 } }).mockResolvedValueOnce({ data: { text: "Completa tis a of", confidence: 90 } });
    const output = await startExtraction("cleaned", "form", vi.fn(), "original").promise;
    expect(recognize).toHaveBeenNthCalledWith(1, "prepared:original", { rotateAuto: true });
    expect(output[0].text).toBe("Complete this form");
    expect(parameters).toHaveBeenCalledWith({ tessedit_pageseg_mode: "3", user_defined_dpi: "300" });
  });
  it("can prepare an original form without running a comparison pass", async () => {
    ready(); recognize.mockResolvedValue({ data: { text: "Section 1", confidence: 80 } });
    await startExtraction("cleaned", "form", vi.fn(), "original", false).promise;
    expect(recognize).toHaveBeenCalledOnce();
    expect(recognize).toHaveBeenCalledWith("prepared:original", { rotateAuto: true });
  });
  it("reads scattered notes and releases the worker", async () => {
    ready(); recognize.mockResolvedValue({ data: { text: "  Check pump\nFriday  ", confidence: 80 } });
    expect(await startExtraction("photo", "notes", vi.fn()).promise).toEqual([{ text: "Check pump\nFriday", confidence: 80, source: "Cleaned photo" }]);
    expect(parameters).toHaveBeenCalledWith({ tessedit_pageseg_mode: "11", user_defined_dpi: "300" });
    expect(recognize).toHaveBeenCalledWith("photo", { rotateAuto: true }); expect(terminate).toHaveBeenCalledOnce();
  });
  it("compares both images without losing a lower confidence alternative", async () => {
    ready(); recognize.mockResolvedValueOnce({ data: { text: "Chock pump", confidence: 30 } }).mockResolvedValueOnce({ data: { text: "Check pump", confidence: 75 } });
    const results = await startExtraction("clean", "block", vi.fn(), "original").promise;
    expect(results.map(result => result.text)).toEqual(["Check pump", "Chock pump"]);
    expect(parameters).toHaveBeenCalledWith({ tessedit_pageseg_mode: "6", user_defined_dpi: "300" });
    expect(terminate).toHaveBeenCalledOnce();
  });
  it("prefers a nonempty reading over an empty high confidence result", async () => {
    ready(); recognize.mockResolvedValueOnce({ data: { text: "", confidence: 95 } }).mockResolvedValueOnce({ data: { text: "Friday", confidence: 30 } });
    const results = await startExtraction("clean", "line", vi.fn(), "original").promise;
    expect(results[0].text).toBe("Friday");
    expect(parameters).toHaveBeenCalledWith({ tessedit_pageseg_mode: "7", user_defined_dpi: "300" });
  });
  it("cancels while loading and terminates a late worker without reading the image", async () => {
    let resolveWorker!: (value: typeof worker) => void;
    create.mockReturnValue(new Promise(resolve => { resolveWorker = resolve; })); terminate.mockResolvedValue({});
    const job = startExtraction("photo", "document", vi.fn());
    const rejected = expect(job.promise).rejects.toMatchObject({ name: "AbortError" });
    job.cancel(); await rejected; resolveWorker(worker); await Promise.resolve(); await Promise.resolve();
    expect(recognize).not.toHaveBeenCalled(); expect(terminate).toHaveBeenCalledOnce();
  });
  it("does not start a second pass after cancellation during recognition", async () => {
    ready(); let finish!: (value: unknown) => void;
    recognize.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const job = startExtraction("clean", "notes", vi.fn(), "original");
    await vi.waitFor(() => expect(recognize).toHaveBeenCalledOnce());
    const rejected = expect(job.promise).rejects.toMatchObject({ name: "AbortError" });
    job.cancel(); await rejected; finish({ data: { text: "Late result", confidence: 90 } });
    await Promise.resolve(); await Promise.resolve();
    expect(recognize).toHaveBeenCalledOnce(); expect(terminate).toHaveBeenCalledOnce();
  });
  it("reports reading failure and releases the worker", async () => {
    ready(); recognize.mockRejectedValue(new Error("Unreadable"));
    await expect(startExtraction("photo", "document", vi.fn()).promise).rejects.toThrow("Unreadable");
    expect(terminate).toHaveBeenCalledOnce();
  });
});
