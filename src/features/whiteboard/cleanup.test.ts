import { describe, expect, it } from "vitest";
import { cleanPixels } from "./cleanup";
describe("whiteboard cleanup", () => {
  it("preserves original colour values at zero strength", () => {
    const pixels = new Uint8ClampedArray([35, 80, 110, 255, 200, 210, 220, 255]);
    expect(cleanPixels(pixels.slice(), 2, 1, 0, true)).toEqual(pixels);
  });
  it("whitens a shaded background while retaining dark writing", () => {
    const pixels = new Uint8ClampedArray([180, 180, 180, 255, 25, 25, 25, 255]);
    const result = cleanPixels(pixels, 2, 1, 1, true);
    expect(result[0]).toBe(255);
    expect(result[4]).toBeLessThan(30);
  });
  it("keeps coloured ink and supports monochrome", () => {
    const pixels = new Uint8ClampedArray([200, 30, 30, 255, 240, 240, 240, 255]);
    const colour = cleanPixels(pixels.slice(), 2, 1, .65, true);
    expect(colour[0]).toBeGreaterThan(colour[1]);
    const mono = cleanPixels(pixels.slice(), 2, 1, .65, false);
    expect(mono[0]).toBe(mono[1]);
    expect(mono[1]).toBe(mono[2]);
  });
});
