import { Capacitor } from "@capacitor/core";
import { AndroidTranscriptionProvider } from "./AndroidTranscriptionProvider";
import { BrowserTranscriptionProvider } from "./BrowserTranscriptionProvider";
import type { TranscriptionProvider } from "./TranscriptionProvider";
export function createTranscriptionProvider(): TranscriptionProvider {
  return Capacitor.getPlatform() === "android"
    ? new AndroidTranscriptionProvider()
    : new BrowserTranscriptionProvider();
}
export function voicePrivacyNotice(): string {
  return Capacitor.getPlatform() === "android"
    ? "Lumo uses on-device Android speech recognition when available. Otherwise, your Android speech service may send audio to its provider’s servers and require internet. Lumo never saves raw audio."
    : "Browser speech recognition may send your microphone audio to the browser vendor’s servers and require internet. Lumo never saves raw audio.";
}
export function voiceProviderId(): "android" | "browser" {
  return Capacitor.getPlatform() === "android" ? "android" : "browser";
}
