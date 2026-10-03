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
    expect(cb.onFinalTranscript).not.toHaveBeenCalled();
    expect(cb.onPartialTranscript).toHaveBeenCalledWith("Lumo Olivia needs");
    await vi.advanceTimersByTimeAsync(900);
    expect(cb.onFinalTranscript).toHaveBeenCalledWith("Lumo");
    cb.onStatus.mockClear();
    FakeRecognition.instance.onend?.();
    await vi.advanceTimersByTimeAsync(700);
    expect(cb.onStatus).not.toHaveBeenCalledWith("Voice connected");
    FakeRecognition.instance.onstart?.();
    expect(cb.onStatus).toHaveBeenCalledWith("Voice connected");
    provider.stopListening();
  });
  it("saves cumulative mobile results once as a complete sentence", async () => {
    const provider = new BrowserTranscriptionProvider();
    const cb = callbacks();
    const pending = provider.startListening(cb);
    FakeRecognition.instance.onstart?.();
    await pending;
    const revisions = [
      "Hi",
      "Hi",
      "Hi Olivia",
      "Hi Olivia needs",
      "Hi Olivia needs to go",
      "Hi Olivia needs to go to bed",
    ];
    for (let i = 0; i < revisions.length; i++) {
      FakeRecognition.instance.onresult?.({
        resultIndex: i,
        results: revisions
          .slice(0, i + 1)
          .map((transcript) => ({ isFinal: true, 0: { transcript } })),
      });
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(cb.onPartialTranscript).toHaveBeenLastCalledWith(
      "Hi Olivia needs to go to bed",
    );
    await vi.advanceTimersByTimeAsync(900);
    expect(cb.onFinalTranscript).toHaveBeenCalledTimes(1);
    expect(cb.onFinalTranscript).toHaveBeenCalledWith(
      "Hi Olivia needs to go to bed",
    );
    FakeRecognition.instance.onresult?.({
      resultIndex: 0,
      results: revisions.map((transcript) => ({
        isFinal: true,
        0: { transcript },
      })),
    });
    await vi.advanceTimersByTimeAsync(900);
    expect(cb.onFinalTranscript).toHaveBeenCalledTimes(1);
    provider.stopListening();
  });
  it("replaces provisional hypotheses instead of accumulating event history", async () => {
    const provider = new BrowserTranscriptionProvider();
    const cb = callbacks();
    const pending = provider.startListening(cb);
    FakeRecognition.instance.onstart?.();
    await pending;
    for (const transcript of [
      "Hi",
      "Hi Olivia needs",
      "Hi Olivia needs to go to bed",
    ]) {
      FakeRecognition.instance.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: false, 0: { transcript } }],
      });
    }
    expect(cb.onPartialTranscript).toHaveBeenLastCalledWith(
      "Hi Olivia needs to go to bed",
    );
    expect(cb.onFinalTranscript).not.toHaveBeenCalled();
    provider.stopListening();
  });
  it("flushes the completed sentence when voice stops", async () => {
    const provider = new BrowserTranscriptionProvider();
    const cb = callbacks();
    const pending = provider.startListening(cb);
    FakeRecognition.instance.onstart?.();
    await pending;
    FakeRecognition.instance.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: true, 0: { transcript: "Olivia needs to go to bed" } },
      ],
    });
    provider.stopListening();
    expect(cb.onFinalTranscript).toHaveBeenCalledWith(
      "Olivia needs to go to bed",
    );
    await vi.advanceTimersByTimeAsync(1000);
    expect(cb.onFinalTranscript).toHaveBeenCalledTimes(1);
  });
  it("accepts repeated speech after the recognizer restarts", async () => {
    const provider = new BrowserTranscriptionProvider();
    const cb = callbacks();
    const pending = provider.startListening(cb);
    FakeRecognition.instance.onstart?.();
    await pending;
    const event = {
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: "Hello Olivia" } }],
    };
    FakeRecognition.instance.onresult?.(event);
    FakeRecognition.instance.onend?.();
    await vi.advanceTimersByTimeAsync(700);
    FakeRecognition.instance.onstart?.();
    FakeRecognition.instance.onresult?.(event);
    await vi.advanceTimersByTimeAsync(900);
    expect(cb.onFinalTranscript).toHaveBeenCalledTimes(2);
    provider.stopListening();
  });
  it("keeps the newest correction to a final slot before saving", async () => {
    const provider = new BrowserTranscriptionProvider();
    const cb = callbacks();
    const pending = provider.startListening(cb);
    FakeRecognition.instance.onstart?.();
    await pending;
    for (const transcript of [
      "Hi",
      "Hi Olivia",
      "Hi Olivia needs to go to bed",
    ]) {
      FakeRecognition.instance.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript } }],
      });
    }
    await vi.advanceTimersByTimeAsync(900);
    expect(cb.onFinalTranscript).toHaveBeenCalledTimes(1);
    expect(cb.onFinalTranscript).toHaveBeenCalledWith(
      "Hi Olivia needs to go to bed",
    );
    provider.stopListening();
  });
});
