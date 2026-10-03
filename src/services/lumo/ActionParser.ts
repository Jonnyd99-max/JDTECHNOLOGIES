import type { Action, TranscriptEntry } from "../../models";
export interface ActionParser {
  parse(text: string, meetingId: string): Action;
}
export class DeterministicActionParser implements ActionParser {
  parse(text: string, meetingId: string): Action {
    const clean = text.trim().replace(/[.!]+$/, "");
    const match =
      /^(I|me|[\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,2}?)\s+(?:needs?\s+to|has\s+to|will|should|must|to)\s+(.+)$/iu.exec(
        clean,
      );
    const owner = match
      ? /^(i|me)$/i.test(match[1])
        ? "Me"
        : match[1]
      : "Unassigned";
    const description = (match?.[2] || clean).replace(/^./, (c) =>
      c.toUpperCase(),
    );
    return {
      id: crypto.randomUUID(),
      owner,
      description,
      sourceText: text,
      meetingId,
      createdAt: new Date().toISOString(),
      status: "open",
      confirmed: false,
      confidence: match ? 0.9 : 0.5,
    };
  }
}
export interface SuggestedActionProvider {
  suggest(entries: TranscriptEntry[], meetingId: string): Promise<Action[]>;
}
// Optional future integration. No transcript is sent to any service by default.
export class DisabledSuggestedActionProvider implements SuggestedActionProvider {
  async suggest(): Promise<Action[]> {
    return [];
  }
}
