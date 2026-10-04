import { describe, expect, it } from "vitest";
import { mergeRegions, mixedNotes, regionKind, splitLabelLines, type DetectedLine } from "./mixedRegions";
const word = (text: string, x0: number, x1: number) => ({ text, confidence: 70, bbox: { x0, y0: 10, x1, y1: 30 } });
describe("mixed text routing", () => {
  it("leaves ambiguous type predictions uncertain", () => {
    expect(regionKind(.9)).toBe("handwritten"); expect(regionKind(.1)).toBe("printed");
    expect(regionKind(.6)).toBe("uncertain"); expect(regionKind(NaN)).toBe("uncertain");
  });
  it("separates a printed label from handwriting in the same line", () => {
    const lines: DetectedLine[] = [{ bbox: { x0: 0, y0: 10, x1: 140, y1: 30 }, words: [word("NAME:", 0, 40), word("OCR", 48, 80), word("guess", 86, 140)] }];
    const output = mergeRegions(lines, [[.03, .96, .91]]);
    expect(output.map(r => r.kind)).toEqual(["printed", "handwritten"]);
    expect(output[1].bbox).toEqual({ x0: 48, y0: 10, x1: 140, y1: 30 });
    output[1].text = "Corrected name";
    expect(mixedNotes(output)).toBe("NAME: [Handwriting suggestion: Corrected name]"); expect(output[1].printedText).toBe("OCR guess");
  });
  it("does not merge across columns or different lines", () => {
    const lines = [{ bbox: { x0: 0, y0: 10, x1: 200, y1: 30 }, words: [word("Left", 0, 40), word("Right", 150, 200)] }, { bbox: { x0: 0, y0: 40, x1: 40, y1: 60 }, words: [word("Next", 0, 40)] }];
    expect(mergeRegions(lines, [[.01, .01], [.01]])).toHaveLength(3);
    expect(mixedNotes(mergeRegions(lines, [[.01, .01], [.01]]))).toBe("Left Right\nNext");
  });
  it("retains OCR for unclassified regions", () => {
    const output = mergeRegions([{ bbox: { x0: 0, y0: 10, x1: 40, y1: 30 }, words: [word("Unreadable", 0, 40)] }], []);
    expect(output[0].kind).toBe("uncertain"); expect(output[0].text).toBe("Unreadable");
  });
  it("isolates a field after a printed colon label and preserves its row", () => {
    const lines = splitLabelLines([{ bbox: { x0: 0, y0: 10, x1: 140, y1: 30 }, words: [word("NAME:", 0, 40), word("answer", 48, 140)] }]);
    expect(lines).toHaveLength(2);
    expect(lines.map(l => l.row)).toEqual([0, 0]);
    expect(mixedNotes(mergeRegions(lines, [[.01], [.95]]))).toBe("NAME: [Handwriting suggestion: answer]");
  });
});
