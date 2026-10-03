export interface WakeMatch {
  instruction: string;
  phrase: string;
}
export class WakePhraseDetector {
  detect(text: string): WakeMatch | null {
    const pattern =
      /\b(?:lumo|luma|lum[o0]|loomo)\b[\s,.:;!—-]*(?:(?:take|note)\s+(?:(?:this|an?|the)\s+)?(?:action|note)|action)\b[\s,.:;!—-]*/i;
    const match = pattern.exec(text);
    if (match)
      return {
        instruction: text.slice(match.index + match[0].length).trim(),
        phrase: match[0].trim(),
      };
    const single = /\b(?:lumo|luma|lum0|loomo)\b[\s,.:;!—-]*/i.exec(text);
    return single
      ? {
          instruction: text.slice(single.index + single[0].length).trim(),
          phrase: single[0].trim(),
        }
      : null;
  }
}
