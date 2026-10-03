import { WakePhraseDetector } from "./WakePhraseDetector";
// Speech APIs split one instruction into several final transcript events.
// This buffer remains open only until a silence boundary; subsequent conversation is ignored.
export class ActionCaptureService {
  private buffer = "";
  private listening = false;
  private pendingTrigger = "";
  private detector = new WakePhraseDetector();
  get active(): boolean {
    return this.listening;
  }
  get instruction(): string {
    return this.buffer;
  }
  observePartial(text: string): boolean {
    if (
      !this.listening &&
      this.detector.detect(`${this.pendingTrigger} ${text}`)
    )
      this.listening = true;
    return this.listening;
  }
  accept(text: string): { woke: boolean; previous?: string } {
    const combined = `${this.pendingTrigger} ${text}`.trim();
    const match = this.detector.detect(text) || this.detector.detect(combined);
    this.pendingTrigger = "";
    if (match) {
      const previous =
        this.listening && this.buffer.trim() ? this.buffer.trim() : undefined;
      this.listening = true;
      this.buffer = match.instruction;
      return { woke: true, previous };
    }
    if (this.listening) this.buffer = `${this.buffer} ${text}`.trim();
    else
      this.pendingTrigger =
        /\btake(?:[\s,]+this)?[\s,.:;!—-]*$/i.exec(combined)?.[0] || "";
    return { woke: false };
  }
  flush(): string {
    const text = this.buffer.trim();
    this.buffer = "";
    this.listening = false;
    this.pendingTrigger = "";
    return text;
  }
}
