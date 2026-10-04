// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cropHandwritingLine, selectionBetween, startHandwriting } from "./handwriting";
class FakeWorker {
  static last: FakeWorker;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() { FakeWorker.last = this; }
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("local handwriting worker", () => {
  it("posts only to the local worker, forwards progress and releases it after a result", async () => {
    vi.stubGlobal("Worker", FakeWorker); const progress = vi.fn();
    const job = startHandwriting("data:image/png;base64,crop", progress);
    expect(FakeWorker.last.postMessage).toHaveBeenCalledWith({ image: "data:image/png;base64,crop" });
    FakeWorker.last.onmessage?.({ data: { type: "progress", message: "Reading" } });
    FakeWorker.last.onmessage?.({ data: { type: "result", text: "Meeting notes" } });
    expect(await job.promise).toBe("Meeting notes"); expect(progress).toHaveBeenCalledWith("Reading"); expect(FakeWorker.last.terminate).toHaveBeenCalledOnce();
  });
  it("cancels model loading and ignores late results", async () => {
    vi.stubGlobal("Worker", FakeWorker); const job = startHandwriting("crop", vi.fn());
    const rejected = expect(job.promise).rejects.toMatchObject({ name: "AbortError" });
    job.cancel(); FakeWorker.last.onmessage?.({ data: { type: "result", text: "Late reading" } });
    await rejected; expect(FakeWorker.last.terminate).toHaveBeenCalledOnce();
  });
  it("releases a failed worker", async () => {
    vi.stubGlobal("Worker", FakeWorker); const job = startHandwriting("crop", vi.fn());
    FakeWorker.last.onerror?.(); await expect(job.promise).rejects.toThrow("unavailable"); expect(FakeWorker.last.terminate).toHaveBeenCalledOnce();
  });
  it("times out a stalled download", async () => {
    vi.useFakeTimers(); vi.stubGlobal("Worker", FakeWorker); const job = startHandwriting("crop", vi.fn());
    const rejected = expect(job.promise).rejects.toThrow("timed out"); vi.advanceTimersByTime(300000);
    await rejected; expect(FakeWorker.last.terminate).toHaveBeenCalledOnce();
  });
});
describe("handwriting selection", () => {
  it("handles reverse-direction selection", () => {
    const selection = selectionBetween({ x: .6, y: .3 }, { x: .2, y: .1 });
    expect(selection.x).toBe(.2); expect(selection.y).toBe(.1); expect(selection.width).toBeCloseTo(.4); expect(selection.height).toBeCloseTo(.2);
  });
  it("rejects tiny selections and whole portrait pages before drawing", async () => {
    vi.stubGlobal("Image", class { width = 100; height = 200; src = ""; decode = async () => {}; });
    await expect(cropHandwritingLine("photo", { x: 0, y: 0, width: .02, height: .02 })).rejects.toThrow("one horizontal line");
    await expect(cropHandwritingLine("photo", { x: 0, y: 0, width: 1, height: 1 })).rejects.toThrow("one horizontal line");
  });
});
