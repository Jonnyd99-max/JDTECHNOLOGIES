import type {
  TranscriptionCallbacks,
  TranscriptionProvider,
} from "./TranscriptionProvider";
interface Result {
  isFinal: boolean;
  0: { transcript: string };
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult:
    | ((event: { resultIndex: number; results: ArrayLike<Result> }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;
function constructor(): RecognitionConstructor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}
export class BrowserTranscriptionProvider implements TranscriptionProvider {
  get available(): boolean {
    return !!constructor();
  }
  private recognition?: Recognition;
  private running = false;
  private restart?: ReturnType<typeof setTimeout>;
  private startup?: ReturnType<typeof setTimeout>;
  private feedback?: ReturnType<typeof setTimeout>;
  private cancelStartup?: () => void;
  startListening(callbacks: TranscriptionCallbacks): Promise<void> {
    this.stopListening();
    const Ctor = constructor();
    if (!Ctor)
      throw new Error(
        "Speech recognition is unavailable here. You can still capture actions manually. Try Chrome on Android for voice.",
      );
    this.running = true;
    const recognition = new Ctor();
    this.recognition = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";
    let ready = false;
    let failures = 0;
    let rejectStart: (reason: Error) => void = () => {};
    let resolveStart: () => void = () => {};
    const started = new Promise<void>((resolve, reject) => {
      resolveStart = resolve;
      rejectStart = reject;
    });
    this.cancelStartup = () => rejectStart(new Error("Voice start cancelled."));
    recognition.onstart = () => {
      if (!this.running) return;
      ready = true;
      clearTimeout(this.startup);
      this.cancelStartup = undefined;
      callbacks.onStatus("Voice connected");
      clearTimeout(this.feedback);
      this.feedback = setTimeout(() => {
        if (this.running)
          callbacks.onStatus(
            "No recognised speech yet. Say a short sentence. If no words appear below, pause and retry voice; Chrome may be unable to reach its speech service.",
          );
      }, 12000);
      resolveStart();
    };
    const fail = (message: string) => {
      this.running = false;
      clearTimeout(this.startup);
      clearTimeout(this.feedback);
      this.cancelStartup = undefined;
      rejectStart(new Error(message));
      if (ready) callbacks.onError(message, true);
    };
    recognition.onresult = (event) => {
      if (!this.running) return;
      failures = 0;
      clearTimeout(this.feedback);
      let partial = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) callbacks.onFinalTranscript(result[0].transcript);
        else partial += result[0].transcript;
      }
      callbacks.onPartialTranscript(partial);
    };
    recognition.onerror = (event) => {
      if (!this.running) return;
      const fatal =
        [
          "not-allowed",
          "service-not-allowed",
          "audio-capture",
          "network",
          "language-not-supported",
        ].includes(event.error) ||
        (event.error !== "no-speech" && ++failures >= 3);
      const message =
        event.error === "no-speech"
          ? "No speech detected. Speak when you are ready."
          : event.error === "network"
            ? "Speech recognition needs a network connection. Check your connection or add actions manually."
            : fatal
              ? "Voice access stopped. Check microphone permissions, then retry voice."
              : "Voice recognition paused. Lumo will try to reconnect.";
      if (fatal) fail(message);
      else callbacks.onError(message, false);
    };
    recognition.onend = () => {
      if (this.running) {
        callbacks.onStatus("Reconnecting voice recognition…");
        this.restart = setTimeout(() => {
          if (!this.running) return;
          try {
            recognition.start();
            this.startup = setTimeout(
              () =>
                fail("Chrome did not restart speech recognition. Retry voice."),
              10000,
            );
          } catch {
            fail(
              "Voice could not reconnect. Retry voice or add actions manually.",
            );
          }
        }, 700);
      }
    };
    try {
      this.startup = setTimeout(
        () =>
          fail(
            "Chrome did not start speech recognition. Check microphone permission and your connection, then retry voice.",
          ),
        10000,
      );
      recognition.start();
    } catch {
      fail("Voice could not start. Retry or continue with manual actions.");
    }
    return started;
  }
  stopListening(): void {
    this.running = false;
    clearTimeout(this.restart);
    clearTimeout(this.startup);
    clearTimeout(this.feedback);
    this.cancelStartup?.();
    this.cancelStartup = undefined;
    if (this.recognition) {
      this.recognition.onend = null;
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onstart = null;
      this.recognition.abort();
      this.recognition = undefined;
    }
  }
}
