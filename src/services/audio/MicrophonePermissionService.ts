export class MicrophonePermissionService {
  async request(): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error(
        "Microphone access is unavailable. Open Lumo over HTTPS in a supported browser.",
      );
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      throw new Error(
        name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access in your browser or Android app settings, then retry."
          : name === "NotFoundError"
            ? "No microphone was found. Connect a microphone and retry."
            : "Your microphone is unavailable or in use. Close other recording apps and retry.",
      );
    }
  }
}
