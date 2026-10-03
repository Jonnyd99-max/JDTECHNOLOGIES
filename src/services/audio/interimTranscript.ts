// Some mobile engines return overlapping cumulative hypotheses in separate slots.
// Rebuild the provisional sentence each event; never append it to saved speech.
export function interimTranscript(hypotheses: string[]): string {
  let words: string[] = [];
  const key = (word: string) =>
    word.toLocaleLowerCase("en-GB").replace(/[^\p{L}\p{N}]/gu, "");
  for (const hypothesis of hypotheses) {
    const next = hypothesis.trim().split(/\s+/).filter(Boolean);
    if (!next.length) continue;
    if (
      words.length &&
      words.every((word, i) => key(word) === key(next[i] || ""))
    ) {
      words = next;
      continue;
    }
    let overlap = Math.min(words.length, next.length);
    while (
      overlap > 0 &&
      !words.slice(-overlap).every((word, i) => key(word) === key(next[i]))
    )
      overlap--;
    words = [...words, ...next.slice(overlap)];
  }
  return words.join(" ");
}

// Collapse only a recognizer's progressive revision ladder (at least two
// sentence extensions). Repeated complete utterances and ordinary fragments
// remain separate, so genuine repetition is not removed from saved speech.
export function finalTranscriptSegments(hypotheses: string[]): string[] {
  const result: string[] = [];
  const tokens = (text: string) =>
    text.toLocaleLowerCase("en-GB").match(/[\p{L}\p{N}]+/gu) || [];
  let group: string[] = [];
  let extensions = 0;
  const flush = () => {
    result.push(...(extensions >= 2 ? group.slice(-1) : group));
    group = [];
    extensions = 0;
  };
  for (const text of hypotheses) {
    if (!text.trim()) continue;
    const previous = tokens(group.at(-1) || "");
    const next = tokens(text);
    if (previous.length && previous.every((word, i) => word === next[i])) {
      if (next.length > previous.length) extensions++;
    } else flush();
    group.push(text.trim());
  }
  flush();
  return result;
}
