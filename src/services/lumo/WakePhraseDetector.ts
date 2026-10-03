export interface WakeMatch {
  instruction: string;
  phrase: string;
}
export class WakePhraseDetector {
  detect(text: string): WakeMatch | null {
    // Explicit speech-engine spellings, rather than broad fuzzy matching.
    const wake = String.raw`\b(?:lumos|lumo(?:['’]s)?|luma|lum0|loomo|limo|lumi|lumoh|lumoe|lummo|lumoo|loumo|leumo|(?:lou|loo|lu)\s+mo)\b[\s,.:;!—-]*`;
    const pattern = new RegExp(
      `${wake}(?:(?:take|note)\\s+(?:(?:this|an?|the)\\s+)?(?:action|note)|action)\\b[\\s,.:;!—-]*`,
      "i",
    );
    const match = pattern.exec(text);
    if (match)
      return {
        instruction: text.slice(match.index + match[0].length).trim(),
        phrase: match[0].trim(),
      };
    const single = new RegExp(wake, "i").exec(text);
    return single
      ? {
          instruction: text.slice(single.index + single[0].length).trim(),
          phrase: single[0].trim(),
        }
      : null;
  }
}
