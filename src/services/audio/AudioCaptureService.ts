import { MicrophonePermissionService } from "./MicrophonePermissionService";
export class AudioCaptureService {
  private stream?: MediaStream;
  async start(): Promise<void> {
    this.stop();
    this.stream = await new MicrophonePermissionService().request();
  }
  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
  }
}
