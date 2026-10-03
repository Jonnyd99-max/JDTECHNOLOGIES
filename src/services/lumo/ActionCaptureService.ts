import { WakePhraseDetector } from "./WakePhraseDetector";
// Speech APIs split one instruction into several final transcript events.
// This buffer remains open only until a silence boundary; subsequent conversation is ignored.
export class ActionCaptureService {
  private buffer = "";
  private listening = false;
  private detector = new WakePhraseDetector();
  get active(): boolean {
    return this.listening;
  }
  get instruction(): string {
    return this.buffer;
  }
  accept(text: string): { woke: boolean; previous?: string } {
    const match = this.detector.detect(text);
    if (match) {
      const previous =
        this.listening && this.buffer.trim() ? this.buffer.trim() : undefined;
      this.listening = true;
      this.buffer = match.instruction;
      return { woke: true, previous };
    }
    if (this.listening) this.buffer = `${this.buffer} ${text}`.trim();
    return { woke: false };
  }
  flush(): string {
    const text = this.buffer.trim();
    this.buffer = "";
    this.listening = false;
    return text;
  }
}
