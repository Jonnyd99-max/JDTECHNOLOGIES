// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserTranscriptionProvider } from "./BrowserTranscriptionProvider";
class FakeRecognition {
  static instance: FakeRecognition;
  constructor() {
    FakeRecognition.instance = this;
  }
  continuous = false;
  interimResults = false;
  lang = "";
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onresult:
    | ((event: {
        resultIndex: number;
        results: { isFinal: boolean; 0: { transcript: string } }[];
      }) => void)
    | null = null;
  start = vi.fn();
  abort = vi.fn();
}
const callbacks = () => ({
  onStatus: vi.fn(),
  onError: vi.fn(),
  onPartialTranscript: vi.fn(),
  onFinalTranscript: vi.fn(),
});
describe("Chrome recognition lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: FakeRecognition,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(window, "SpeechRecognition");
  });
  it("waits for Chrome to confirm recognition has started", async () => {
    const provider = new BrowserTranscriptionProvider();
    const cb = callbacks();
    const pending = provider.startListening(cb);
    expect(cb.onStatus).not.toHaveBeenCalled();
    FakeRecognition.instance.onstart?.();
    await pending;
    expect(cb.onStatus).toHaveBeenCalledWith("Voice connected");
    provider.stopListening();
  });
  it("reports a silent startup rather than pretending to listen", async () => {
    const provider = new BrowserTranscriptionProvider();
    const pending = expect(
      provider.startListening(callbacks()),
    ).rejects.toThrow("did not start");
    await vi.advanceTimersByTimeAsync(10000);
    await pending;
    provider.stopListening();
  });
  it("keeps network failure actionable and does not restart", async () => {
    const provider = new BrowserTranscriptionProvider();
    const cb = callbacks();
    const pending = provider.startListening(cb);
    FakeRecognition.instance.onstart?.();
    await pending;
    FakeRecognition.instance.onerror?.({ error: "network" });
    FakeRecognition.instance.onend?.();
    await vi.advanceTimersByTimeAsync(2000);
    expect(cb.onError).toHaveBeenCalledWith(
      expect.stringContaining("network connection"),
      true,
    );
    expect(FakeRecognition.instance.start).toHaveBeenCalledTimes(1);
    provider.stopListening();
  });
  it("cancels pending startup when voice is paused", async () => {
    const provider = new BrowserTranscriptionProvider();
    const pending = expect(
      provider.startListening(callbacks()),
    ).rejects.toThrow("cancelled");
    provider.stopListening();
    await pending;
    expect(FakeRecognition.instance.abort).toHaveBeenCalled();
  });
  it("explains microphone access without returned speech", async () => {
    const provider = new BrowserTranscriptionProvider();
    const cb = callbacks();
    const pending = provider.startListening(cb);
    FakeRecognition.instance.onstart?.();
    await pending;
    await vi.advanceTimersByTimeAsync(12000);
    expect(cb.onStatus).toHaveBeenCalledWith(
      expect.stringContaining("No recognised speech yet"),
    );
    provider.stopListening();
  });
  it("delivers final and interim speech and waits for restart acknowledgement", async () => {
    const provider = new BrowserTranscriptionProvider();
    const cb = callbacks();
    const pending = provider.startListening(cb);
    FakeRecognition.instance.onstart?.();
    await pending;
    FakeRecognition.instance.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: true, 0: { transcript: "Lumo" } },
        { isFinal: false, 0: { transcript: "Olivia needs" } },
      ],
    });
    expect(cb.onFinalTranscript).toHaveBeenCalledWith("Lumo");
    expect(cb.onPartialTranscript).toHaveBeenCalledWith("Olivia needs");
    cb.onStatus.mockClear();
    FakeRecognition.instance.onend?.();
    await vi.advanceTimersByTimeAsync(700);
    expect(cb.onStatus).not.toHaveBeenCalledWith("Voice connected");
    FakeRecognition.instance.onstart?.();
    expect(cb.onStatus).toHaveBeenCalledWith("Voice connected");
    provider.stopListening();
  });
});
