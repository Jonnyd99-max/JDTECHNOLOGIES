import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type {
  NativeTranscriptionProvider,
  TranscriptionCallbacks,
} from "./TranscriptionProvider";

export interface NativeSpeechEvent {
  text?: string;
  message?: string;
  fatal?: boolean;
}
export interface LumoSpeechBridge {
  getAvailability(): Promise<{ available: boolean; onDevice: boolean }>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  addListener(
    event: string,
    listener: (data: NativeSpeechEvent) => void,
  ): Promise<PluginListenerHandle>;
}
const speech = registerPlugin<LumoSpeechBridge>("LumoSpeech");

export class AndroidTranscriptionProvider implements NativeTranscriptionProvider {
  readonly available = true;
  readonly managesMicrophone = true;
  private network = true;
  get requiresNetwork(): boolean {
    return this.network;
  }
  private generation = 0;
  private listeners: PluginListenerHandle[] = [];
  private stopping: Promise<void> = Promise.resolve();

  constructor(private bridge: LumoSpeechBridge = speech) {}

  async startListening(callbacks: TranscriptionCallbacks): Promise<void> {
    this.stopListening();
    const generation = ++this.generation;
    await this.stopping;
    const availability = await this.bridge.getAvailability();
    if (generation !== this.generation) return;
    if (!availability.available)
      throw new Error(
        "Android speech recognition is unavailable. Install or enable a speech service in Android settings, or add actions manually.",
      );
    this.network = !availability.onDevice;
    const handlers: [string, (event: NativeSpeechEvent) => void][] = [
      [
        "partialTranscript",
        (event) => callbacks.onPartialTranscript(event.text || ""),
      ],
      [
        "finalTranscript",
        (event) => {
          callbacks.onPartialTranscript("");
          callbacks.onFinalTranscript(event.text || "");
        },
      ],
      [
        "speechError",
        (event) =>
          callbacks.onError(
            event.message || "Android voice paused. Please retry.",
            !!event.fatal,
          ),
      ],
      [
        "speechStatus",
        (event) => callbacks.onStatus(event.message || "Voice connected"),
      ],
    ];
    const handles: PluginListenerHandle[] = [];
    try {
      for (const [event, handler] of handlers) {
        handles.push(
          await this.bridge.addListener(event, (data) => {
            if (generation === this.generation) handler(data);
          }),
        );
        if (generation !== this.generation) {
          await Promise.all(handles.map((handle) => handle.remove()));
          return;
        }
      }
      this.listeners = handles;
      await this.bridge.startListening();
      if (generation !== this.generation) return;
      callbacks.onStatus(
        availability.onDevice
          ? "On-device voice connected"
          : "Android speech service connected · may require internet",
      );
    } catch (error) {
      await Promise.all(handles.map((handle) => handle.remove()));
      this.listeners = [];
      await this.bridge.stopListening().catch(() => undefined);
      throw error;
    }
  }

  stopListening(): void {
    this.generation++;
    const handles = this.listeners.splice(0);
    this.stopping = Promise.all([
      this.bridge.stopListening().catch(() => undefined),
      ...handles.map((handle) => handle.remove().catch(() => undefined)),
    ]).then(() => undefined);
  }
}
