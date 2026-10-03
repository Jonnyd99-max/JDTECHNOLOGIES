export interface TranscriptionCallbacks {
  onPartialTranscript(text: string): void;
  onFinalTranscript(text: string): void;
  onError(message: string, fatal: boolean): void;
  onStatus(message: string): void;
}
export interface TranscriptionProvider {
  readonly available: boolean;
  startListening(callbacks: TranscriptionCallbacks): void;
  stopListening(): void;
}
// Replace this provider with a Capacitor native/offline implementation when available.
export interface NativeTranscriptionProvider extends TranscriptionProvider {
  readonly requiresNetwork: boolean;
}
