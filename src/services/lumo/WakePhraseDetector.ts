export interface WakeMatch {
  instruction: string;
  phrase: string;
}
export class WakePhraseDetector {
  detect(text: string): WakeMatch | null {
    const pattern = /\btake[\s,]+this[\s,]+action\b[\s,.:;!—-]*/i;
    const match = pattern.exec(text);
    if (match)
      return {
        instruction: text.slice(match.index + match[0].length).trim(),
        phrase: match[0].trim(),
      };
    return null;
  }
}
