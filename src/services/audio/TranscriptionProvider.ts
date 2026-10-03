export interface TranscriptionCallbacks {
  onPartialTranscript(text: string): void;
  onFinalTranscript(text: string): void;
  onError(message: string, fatal: boolean): void;
  onStatus(message: string): void;
}
export interface TranscriptionProvider {
  readonly available: boolean;
  readonly managesMicrophone?: boolean;
  startListening(callbacks: TranscriptionCallbacks): void | Promise<void>;
  stopListening(): void;
}
// Native providers own microphone permission and capture, avoiding simultaneous web capture.
export interface NativeTranscriptionProvider extends TranscriptionProvider {
  readonly requiresNetwork: boolean;
}
