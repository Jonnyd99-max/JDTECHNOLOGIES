import { describe, expect, it } from "vitest";
import { normalizeDocumentPixels } from "./documentImage";
describe("printed document preparation", () => {
  it("normalizes a shaded page and keeps dark ink", () => {
    const pixels = new Uint8ClampedArray([50, 50, 50, 255, 180, 180, 180, 255]);
    expect(normalizeDocumentPixels(pixels)).toEqual(new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]));
  });
  it("does not amplify near-uniform backgrounds into artificial text", () => {
    const pixels = new Uint8ClampedArray([180, 180, 180, 255, 185, 185, 185, 255]);
    expect(normalizeDocumentPixels(pixels)).toEqual(pixels);
    expect(pixels[0]).toBe(180); expect(pixels[4]).toBe(185);
  });
});
