export interface Box { x0: number; y0: number; x1: number; y1: number }
export interface DetectedWord { bbox: Box; text: string; confidence: number }
export interface DetectedLine { words: DetectedWord[]; bbox: Box; row?: number }
export type RegionKind = "printed" | "handwritten" | "uncertain";
export interface MixedRegion { bbox: Box; kind: RegionKind; text: string; printedText: string; confidence: number; line: number; row?: number }

export function splitLabelLines(lines: DetectedLine[]): DetectedLine[] {
  return [...lines].sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0).flatMap((line, row) => {
    const parts: DetectedLine[] = [];
    let words: DetectedWord[] = [];
    const flush = () => {
      if (!words.length) return;
      parts.push({ row, words, bbox: { x0: Math.min(...words.map(w => w.bbox.x0)), y0: Math.min(...words.map(w => w.bbox.y0)), x1: Math.max(...words.map(w => w.bbox.x1)), y1: Math.max(...words.map(w => w.bbox.y1)) } });
      words = [];
    };
    line.words.forEach(word => { words.push(word); if (/[:：]\s*$/.test(word.text)) flush(); });
    flush(); return parts;
  });
}

export function regionKind(handwritten: number): RegionKind {
  return handwritten >= .8 ? "handwritten" : handwritten <= .2 ? "printed" : "uncertain";
}
export function contextCandidates(lines: DetectedLine[], probabilities: number[][]) {
  const regions = mergeRegions(lines, probabilities);
  return regions.flatMap((region, index) => {
    if (region.kind !== "uncertain") return [];
    const neighbour = [regions[index - 1], regions[index + 1]].find(other => other && other.line === region.line && other.kind !== "uncertain" && Math.max(region.bbox.x0 - other.bbox.x1, other.bbox.x0 - region.bbox.x1) <= Math.max(region.bbox.y1 - region.bbox.y0, other.bbox.y1 - other.bbox.y0) * 2);
    if (!neighbour) return [];
    return [{ line: region.line, kind: neighbour.kind, indices: lines[region.line].words.flatMap((word, i) => word.bbox.x0 >= region.bbox.x0 && word.bbox.x1 <= region.bbox.x1 ? [i] : []), bbox: { x0: Math.min(region.bbox.x0, neighbour.bbox.x0), y0: Math.min(region.bbox.y0, neighbour.bbox.y0), x1: Math.max(region.bbox.x1, neighbour.bbox.x1), y1: Math.max(region.bbox.y1, neighbour.bbox.y1) } }];
  });
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
  for (const region of regions) {
    const reading = region.text.trim();
    const text = region.kind === "handwritten" ? `[Handwriting suggestion: ${reading || "unreadable"}]` : reading;
    if (!text) continue;
    const row = region.row ?? region.line;
    const line = lines.get(row) || [];
    line.push(text); lines.set(row, line);
  }
  return [...lines.values()].map(line => line.join(" ")).join("\n");
}
