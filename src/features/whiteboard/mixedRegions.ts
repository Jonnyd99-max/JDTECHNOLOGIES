export interface Box { x0: number; y0: number; x1: number; y1: number }
export interface DetectedWord { bbox: Box; text: string; confidence: number }
export interface DetectedLine { words: DetectedWord[]; bbox: Box; row?: number; field?: boolean }
export type RegionKind = "printed" | "handwritten" | "uncertain";
export interface MixedRegion { bbox: Box; kind: RegionKind; text: string; printedText: string; confidence: number; line: number; row?: number; omitted?: string; alternatives?: string[]; accepted?: boolean }

export function splitLabelLines(lines: DetectedLine[]): DetectedLine[] {
  return [...lines].sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0).flatMap((line, row) => {
    const parts: DetectedLine[] = [];
    let words: DetectedWord[] = [];
    let field = false;
    const flush = () => {
      if (!words.length) return;
      parts.push({ row, field, words, bbox: { x0: Math.min(...words.map(w => w.bbox.x0)), y0: Math.min(...words.map(w => w.bbox.y0)), x1: Math.max(...words.map(w => w.bbox.x1)), y1: Math.max(...words.map(w => w.bbox.y1)) } });
      words = [];
    };
    line.words.forEach(word => {
      const previous = words[words.length - 1];
      if (previous && word.bbox.x0 - previous.bbox.x1 > Math.max(word.bbox.y1 - word.bbox.y0, previous.bbox.y1 - previous.bbox.y0) * 1.3) { flush(); field = false; }
      words.push(word);
      if (/[:：]\s*$/.test(word.text)) { flush(); field = true; }
    });
    flush(); return parts;
  });
}

export function regionKind(handwritten: number): RegionKind {
  return handwritten >= .8 ? "handwritten" : handwritten <= .2 ? "printed" : "uncertain";
}
export function stableLineKind(first: number, second: number, field = false): RegionKind {
  if (first <= .2 && second <= .2) return "printed";
  const required = field ? .8 : .95;
  return first >= required && second >= required ? "handwritten" : "uncertain";
}
export function mergeRegions(lines: DetectedLine[], probabilities: number[][]): MixedRegion[] {
  const regions: MixedRegion[] = [];
  lines.forEach((line, index) => {
    let current: MixedRegion | undefined;
    line.words.forEach((word, wordIndex) => {
      const probability = probabilities[index]?.[wordIndex] ?? .5;
      const kind = regionKind(probability);
      const height = word.bbox.y1 - word.bbox.y0;
      const gap = current ? word.bbox.x0 - current.bbox.x1 : Infinity;
      if (current && current.kind === kind && gap <= Math.max(height, current.bbox.y1 - current.bbox.y0) * 2) {
        current.bbox = { x0: current.bbox.x0, y0: Math.min(current.bbox.y0, word.bbox.y0), x1: Math.max(current.bbox.x1, word.bbox.x1), y1: Math.max(current.bbox.y1, word.bbox.y1) };
        current.printedText += ` ${word.text}`;
        current.text = current.printedText;
        current.confidence = Math.min(current.confidence, word.confidence);
      } else {
        current = { bbox: { ...word.bbox }, kind, printedText: word.text, text: word.text, confidence: word.confidence, line: index, row: line.row };
        regions.push(current);
      }
    });
  });
  return regions;
}
export function mixedNotes(regions: MixedRegion[]) {
  const lines = new Map<number, string[]>();
  for (const [index, region] of regions.entries()) {
    if (region.omitted || region.kind === "uncertain") continue;
    const reading = region.text.trim();
    const text = region.kind === "handwritten" && !region.accepted ? handwritingMarker(index) : reading;
    if (!text) continue;
    const row = region.row ?? region.line;
    const line = lines.get(row) || [];
    line.push(text); lines.set(row, line);
  }
  return [...lines.values()].map(line => line.join(" ")).join("\n");
}
export function handwritingMarker(index: number) { return `[Handwriting region ${index + 1}: review needed]`; }
