import { describe, expect, it } from "vitest";
import { detectBoardLines } from "./boardLines";
function scene() {
  const width = 320,
    height = 240,
    pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  const rectangle = (
    x: number,
    y: number,
    w: number,
    h: number,
    colour: number[],
  ) => {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        pixels.set([...colour, 255], ((y + dy) * width + x + dx) * 4);
  };
  const writing = (y: number, colour = [40, 60, 100]) => {
    for (const x of [30, 50, 70, 90]) rectangle(x, y, 7, 16, colour);
  };
  return { width, height, pixels, rectangle, writing };
}
describe("whiteboard handwriting line detection", () => {
  it("keeps adjacent lines separate and excludes red bullets and a long rule", () => {
    const s = scene();
    s.writing(50);
    s.writing(100);
    s.rectangle(10, 50, 8, 16, [180, 20, 20]);
    s.rectangle(0, 10, 320, 3, [40, 60, 100]);
    const lines = detectBoardLines(s.pixels, s.width, s.height);
    expect(lines).toHaveLength(2);
    expect(lines[0].x * s.width).toBeGreaterThan(18);
    expect((lines[0].y + lines[0].height) * s.height).toBeLessThan(
      lines[1].y * s.height,
    );
  });
  it("offers a separate dark-marker mode and rejects empty boards", () => {
    const s = scene();
    expect(detectBoardLines(s.pixels, s.width, s.height)).toEqual([]);
    s.writing(50, [20, 20, 20]);
    expect(detectBoardLines(s.pixels, s.width, s.height)).toEqual([]);
    expect(detectBoardLines(s.pixels, s.width, s.height, "dark")).toHaveLength(
      1,
    );
  });
  it("retains detached overlapping strokes within a line", () => {
    const s = scene();
    s.writing(50);
    s.rectangle(27, 46, 13, 2, [40, 60, 100]);
    const lines = detectBoardLines(s.pixels, s.width, s.height);
    expect(lines).toHaveLength(1);
    expect(lines[0].x * s.width).toBeLessThan(22);
  });
});
