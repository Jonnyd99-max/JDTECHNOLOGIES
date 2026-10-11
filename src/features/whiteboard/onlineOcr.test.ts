// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { ONLINE_IMAGE_LIMIT, parseOnlineReading, readOnlinePhoto } from "./onlineOcr";

afterEach(() => vi.unstubAllGlobals());
describe("online handwriting service", () => {
  it("preserves technical codes and line breaks", () => {
    expect(parseOnlineReading({ OCRExitCode: 1, ParsedResults: [{ FileParseExitCode: 1, ParsedText: " Tool error state – AI/XML\nPush lots. " }] })).toBe("Tool error state – AI/XML\nPush lots.");
  });
  it("rejects partial and failed readings without echoing provider details", () => {
    expect(() => parseOnlineReading({ OCRExitCode: 2, ErrorMessage: "secret-key", ParsedResults: [{ FileParseExitCode: 1, ParsedText: "partial" }] })).toThrow("could not read");
    expect(() => parseOnlineReading(null)).toThrow("unexpected response");
  });
  it("sends one JPEG to the free Engine 3 endpoint with credentials out of the URL", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ OCRExitCode: 1, ParsedResults: [{ FileParseExitCode: 1, ParsedText: "notes" }] }) });
    vi.stubGlobal("fetch", send);
    const abort = new AbortController();
    expect(await readOnlinePhoto(new Blob(["image"], { type: "image/jpeg" }), " test-key ", abort.signal)).toBe("notes");
    expect(send).toHaveBeenCalledTimes(1);
    const [url, options] = send.mock.calls[0];
    expect(url).toBe("https://api.ocr.space/parse/image");
    expect(options.headers).toEqual({ apikey: "test-key" });
    expect(options.signal).toBe(abort.signal);
    expect(options.body.get("OCREngine")).toBe("3");
    expect(options.body.get("isCreateSearchablePdf")).toBe("false");
    expect(options.body.get("file").name).toBe("lumo-photo.jpg");
  });
  it("blocks oversized files before upload and never retries quota errors", async () => {
    const send = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    vi.stubGlobal("fetch", send);
    const signal = new AbortController().signal;
    await expect(readOnlinePhoto(new Blob([new Uint8Array(ONLINE_IMAGE_LIMIT + 1)], { type: "image/jpeg" }), "test-key", signal)).rejects.toThrow("image limit");
    expect(send).not.toHaveBeenCalled();
    await expect(readOnlinePhoto(new Blob(["image"], { type: "image/jpeg" }), "test-key", signal)).rejects.toThrow("free request limit");
    expect(send).toHaveBeenCalledTimes(1);
  });
});
