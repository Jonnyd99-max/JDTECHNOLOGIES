import { describe, expect, it } from "vitest";
import {
  capacity,
  completionTime,
  forecast,
  numberValue,
  percentage,
  periodAt,
  status,
} from "./calculations";
describe("operational time and forecasts", () => {
  it("keeps early morning in the previous 07:00 production period", () => {
    expect(periodAt("14:00")?.elapsed).toBe(7);
    expect(periodAt("03:00")?.remaining).toBe(4);
    expect(periodAt("07:00")?.elapsed).toBe(0);
    expect(periodAt("00:00")?.elapsed).toBe(17);
    expect(periodAt("03:00", 0)?.remaining).toBe(21);
    expect(periodAt("25:00")).toBeNull();
  });
  it("adjusts only future production", () => {
    expect(forecast(2000, 1000, 12, 12, 1.2)?.finish).toBe(2200);
    expect(forecast(2000, 1000, 12, 12, 0.8)?.finish).toBe(1800);
    expect(forecast(2000, 1060, 12, 12)?.percent).toBe(106);
  });
  it("handles zero pace, achieved target and no remaining time", () => {
    expect(forecast(100, 0, 2, 22)?.timeToTarget).toBeNull();
    expect(forecast(100, 100, 2, 22)?.timeToTarget).toBe(0);
    expect(forecast(100, 20, 0, 24)?.finish).toBeNull();
    expect(forecast(100, 20, 24, 0)?.required).toBeNull();
    expect(forecast(0, 20, 2, 22)).toBeNull();
    expect(forecast(1, Number.MAX_VALUE, 0.01, 24)).toBeNull();
  });
  it("formats completion across midnight", () => {
    const snapshot = periodAt("23:00", 7, new Date(2026, 9, 8))!;
    expect(completionTime(snapshot.asOf, 4)).toBe("03:00");
    expect(completionTime(snapshot.asOf, Number.MAX_VALUE)).toBeNull();
    expect(status(89)).toBe("Behind");
    expect(status(150)).toBe("Ahead");
  });
  it("uses a fixed 24 hour operational clock on clock-change dates", () => {
    expect(periodAt("03:00", 7, new Date(2026, 9, 25))?.elapsed).toBe(20);
    expect(periodAt("03:00", 7, new Date(2026, 2, 29))?.remaining).toBe(4);
  });
});
describe("percentage and capacity calculations", () => {
  it("calculates all four percentage modes", () => {
    expect(percentage("attainment", 2120, 2000)).toBe(106);
    expect(percentage("change", 100, 90)).toBe(-10);
    expect(percentage("of", 15, 2000)).toBe(300);
    expect(percentage("difference", 90, 110)).toBe(20);
    expect(percentage("difference", 0, 0)).toBeNull();
    expect(percentage("change", 0, 10)).toBeNull();
    expect(percentage("attainment", Number.MAX_VALUE, 0.001)).toBeNull();
  });
  it("calculates theoretical remaining 24-hour capacity", () => {
    expect(capacity(500, 4, 6)).toEqual({ total: 2000, available: 500 });
    expect(capacity(500, 1.5, 6)).toBeNull();
    expect(capacity(0, 4, 6)).toBeNull();
    expect(capacity(Number.MAX_VALUE, 4, 6)).toBeNull();
  });
  it("rejects blank, invalid and negative numeric inputs", () => {
    for (const input of ["", " ", "abc", "Infinity", "-1"])
      expect(numberValue(input)).toBeNull();
    expect(numberValue("0")).toBe(0);
    expect(numberValue("0", true)).toBeNull();
  });
});
