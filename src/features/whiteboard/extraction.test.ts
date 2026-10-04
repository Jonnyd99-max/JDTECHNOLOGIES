// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
const { create, recognize, terminate, parameters } = vi.hoisted(() => ({ create: vi.fn(), recognize: vi.fn(), terminate: vi.fn(), parameters: vi.fn() }));
vi.mock("tesseract.js", () => ({ createWorker: create, PSM: { AUTO: "3", SPARSE_TEXT: "11" } }));
import { startExtraction } from "./extraction";
const worker = { recognize, terminate, setParameters: parameters };
afterEach(() => { vi.resetAllMocks(); vi.useRealTimers(); });
describe("on-device text extraction", () => {
  it("reads scattered notes and releases the worker", async () => {
    create.mockResolvedValue(worker); parameters.mockResolvedValue({}); terminate.mockResolvedValue({});
    recognize.mockResolvedValue({ data: { text: "  Check pump\nFriday  " } });
    expect(await startExtraction("photo", "notes", vi.fn()).promise).toBe("Check pump\nFriday");
    expect(parameters).toHaveBeenCalledWith({ tessedit_pageseg_mode: "11" });
    expect(recognize).toHaveBeenCalledWith("photo"); expect(terminate).toHaveBeenCalledOnce();
  });
  it("cancels while loading and terminates a late worker without reading the image", async () => {
    let ready!: (value: typeof worker) => void;
    create.mockReturnValue(new Promise(resolve => { ready = resolve; })); terminate.mockResolvedValue({});
    const job = startExtraction("photo", "document", vi.fn());
    const rejected = expect(job.promise).rejects.toMatchObject({ name: "AbortError" });
    job.cancel(); await rejected; ready(worker); await Promise.resolve(); await Promise.resolve();
    expect(recognize).not.toHaveBeenCalled(); expect(terminate).toHaveBeenCalledOnce();
  });
  it("reports reading failure and releases the worker", async () => {
    create.mockResolvedValue(worker); parameters.mockResolvedValue({}); terminate.mockResolvedValue({}); recognize.mockRejectedValue(new Error("Unreadable"));
    await expect(startExtraction("photo", "document", vi.fn()).promise).rejects.toThrow("Unreadable");
    expect(parameters).toHaveBeenCalledWith({ tessedit_pageseg_mode: "3" }); expect(terminate).toHaveBeenCalledOnce();
  });
});
