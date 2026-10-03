import { describe, expect, it, vi } from "vitest";
import {
  AndroidTranscriptionProvider,
  type LumoSpeechBridge,
  type NativeSpeechEvent,
} from "./AndroidTranscriptionProvider";
import type { TranscriptionCallbacks } from "./TranscriptionProvider";
function setup(onDevice = true) {
  const events = new Map<string, (event: NativeSpeechEvent) => void>();
  const remove = vi.fn(async () => undefined);
  const bridge: LumoSpeechBridge = {
    getAvailability: vi.fn(async () => ({ available: true, onDevice })),
    startListening: vi.fn(async () => undefined),
    stopListening: vi.fn(async () => undefined),
    addListener: vi.fn(async (name, callback) => {
      events.set(name, callback);
      return { remove };
    }),
  };
  const callbacks: TranscriptionCallbacks = {
    onPartialTranscript: vi.fn(),
    onFinalTranscript: vi.fn(),
    onError: vi.fn(),
    onStatus: vi.fn(),
  };
  return {
    bridge,
    events,
    remove,
    callbacks,
    provider: new AndroidTranscriptionProvider(bridge),
  };
}
describe("Android speech lifecycle", () => {
  it("uses the native microphone and forwards final/partial/error events", async () => {
    const { provider, events, callbacks, bridge } = setup();
    await provider.startListening(callbacks);
    expect(provider.managesMicrophone).toBe(true);
    expect(provider.requiresNetwork).toBe(false);
    expect(bridge.startListening).toHaveBeenCalledOnce();
    events.get("partialTranscript")!({ text: "Lumo" });
    events.get("finalTranscript")!({
      text: "Lumo action, James to check loading",
    });
    events.get("speechError")!({ message: "Permission denied", fatal: true });
    expect(callbacks.onPartialTranscript).toHaveBeenCalledWith("Lumo");
    expect(callbacks.onFinalTranscript).toHaveBeenCalledWith(
      "Lumo action, James to check loading",
    );
    expect(callbacks.onError).toHaveBeenCalledWith("Permission denied", true);
  });
  it("removes listeners and ignores late recognition after stop", async () => {
    const { provider, events, callbacks, remove } = setup();
    await provider.startListening(callbacks);
    provider.stopListening();
    events.get("finalTranscript")!({
      text: "This result arrived after closing",
    });
    expect(callbacks.onFinalTranscript).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(4);
  });
  it("does not start after being stopped while availability is pending", async () => {
    const { provider, bridge, callbacks } = setup();
    let finish!: (value: { available: boolean; onDevice: boolean }) => void;
    bridge.getAvailability = vi.fn(
      () =>
        new Promise<{ available: boolean; onDevice: boolean }>((resolve) => {
          finish = resolve;
        }),
    );
    const starting = provider.startListening(callbacks);
    await vi.waitFor(() =>
      expect(bridge.getAvailability).toHaveBeenCalledOnce(),
    );
    provider.stopListening();
    finish({ available: true, onDevice: true });
    await starting;
    expect(bridge.startListening).not.toHaveBeenCalled();
    expect(bridge.addListener).not.toHaveBeenCalled();
  });
  it("rejects unavailable speech without requesting the microphone", async () => {
    const { provider, bridge, callbacks } = setup();
    bridge.getAvailability = vi.fn(async () => ({
      available: false,
      onDevice: false,
    }));
    await expect(provider.startListening(callbacks)).rejects.toThrow(
      "unavailable",
    );
    expect(bridge.startListening).not.toHaveBeenCalled();
  });
  it("reports the Android service fallback accurately", async () => {
    const { provider, callbacks } = setup(false);
    await provider.startListening(callbacks);
    expect(provider.requiresNetwork).toBe(true);
    expect(callbacks.onStatus).toHaveBeenCalledWith(
      expect.stringContaining("may require internet"),
    );
  });
});
