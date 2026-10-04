import { describe, expect, it } from "vitest";
import { hasTextInk } from "./textInk";
function photo() {
  const data = new Uint8ClampedArray(160 * 50 * 4).fill(255);
  const rectangle = (x0: number, y0: number, width: number, height: number, value = 20) => {
    for (let y = y0; y < y0 + height; y++) for (let x = x0; x < x0 + width; x++) for (let c = 0; c < 3; c++) data[(y * 160 + x) * 4 + c] = value;
  };
  return { data, rectangle };
}
describe("text-like ink guard", () => {
  it("rejects empty paper and borders without generating a reading", () => {
    const image = photo(); expect(hasTextInk(image.data, 160, 50)).toBe(false);
    image.rectangle(0, 24, 160, 2); image.rectangle(30, 0, 2, 50);
    expect(hasTextInk(image.data, 160, 50)).toBe(false);
  });
  it("rejects a checkbox and scattered single-pixel noise", () => {
    const image = photo(); image.rectangle(60, 10, 20, 2); image.rectangle(60, 30, 20, 2); image.rectangle(60, 10, 2, 22); image.rectangle(78, 10, 2, 22);
    for (let x = 0; x < 160; x += 10) image.rectangle(x, 40, 1, 1);
    expect(hasTextInk(image.data, 160, 50)).toBe(false);
  });
  it("allows multiple character-like strokes even next to a ruling line", () => {
    const image = photo();
    for (let x = 10; x < 150; x += 18) { image.rectangle(x, 14, 3, 18); image.rectangle(x, 14, 8, 3); }
    image.rectangle(0, 45, 160, 2);
    expect(hasTextInk(image.data, 160, 50)).toBe(true);
  });
  it("abstains on faint strokes rather than claiming an accurate reading", () => {
    const image = photo();
    for (let x = 10; x < 150; x += 18) image.rectangle(x, 14, 3, 18, 240);
    expect(hasTextInk(image.data, 160, 50)).toBe(false);
  });
});
