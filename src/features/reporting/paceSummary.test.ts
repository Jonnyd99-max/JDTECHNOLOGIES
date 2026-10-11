import { expect, it } from "vitest";
import { paceSummary } from "./paceSummary";
const snapshot = { group: "pace" as const, sentAt: "2026-10-11T12:00:00Z", target: 1000, actual: 513, elapsed: 12, remaining: 12, multiplier: 1, asOf: "19:00", mode: "work" as const };
it("summarises the pace cushion and completion across midnight", () => {
  const s = paceSummary(snapshot);
  expect(s.items[0][1]).toBe("487");
  expect(s.items[3][1]).toBe("06:24 next day");
  expect(s.takeaway).toContain("5.3% above");
});
it("uses the future scenario and withholds completion when behind", () => {
  expect(paceSummary({ ...snapshot, multiplier: .5 }).items[3][1]).toBe("Not forecast within this period");
  expect(paceSummary({ ...snapshot, multiplier: 2 }).items[2][0]).toBe("Planned future pace / hour");
  expect(paceSummary({ ...snapshot, actual: 500 }).items[3][1]).toBe("07:00 next day");
  expect(paceSummary({ ...snapshot, actual: 1000 }).items[3][1]).toBe("Already achieved");
  expect(paceSummary({ ...snapshot, remaining: 0 }).takeaway).toContain("period has ended");
});
