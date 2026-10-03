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
  startListening(callbacks: TranscriptionCallbacks): void {
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
    recognition.onresult = (event) => {
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
      const fatal = [
        "not-allowed",
        "service-not-allowed",
        "audio-capture",
      ].includes(event.error);
      if (fatal) this.running = false;
      const message =
        event.error === "no-speech"
          ? "No speech detected. Speak when you are ready."
          : event.error === "network"
            ? "Speech recognition needs a network connection. Check your connection or add actions manually."
            : fatal
              ? "Voice access stopped. Check microphone permissions, then retry voice."
              : "Voice recognition paused. Lumo will try to reconnect.";
      callbacks.onError(message, fatal);
    };
    recognition.onend = () => {
      if (this.running) {
        callbacks.onStatus("Reconnecting voice recognition…");
        this.restart = setTimeout(() => {
          if (!this.running) return;
          try {
            recognition.start();
            callbacks.onStatus("Voice connected");
          } catch {
            callbacks.onError(
              "Voice could not reconnect. Retry voice or add actions manually.",
              true,
            );
            this.running = false;
          }
        }, 700);
      }
    };
    try {
      recognition.start();
    } catch {
      this.running = false;
      throw new Error(
        "Voice could not start. Retry or continue with manual actions.",
      );
    }
  }
  stopListening(): void {
    this.running = false;
    clearTimeout(this.restart);
    if (this.recognition) {
      this.recognition.onend = null;
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.abort();
      this.recognition = undefined;
    }
  }
}
