import { expect, it } from "vitest";
import { duration, formatActions, formatSummary } from "./format";
import { DeterministicActionParser } from "../services/lumo/ActionParser";
it("formats elapsed duration including hours", () => {
  expect(duration(1421)).toBe("00:23:41");
  expect(duration(3661)).toBe("01:01:01");
  expect(duration(-10)).toBe("00:00:00");
});
it("formats a clean shareable action list", () => {
  const a = new DeterministicActionParser().parse(
    "James needs to check loading.",
    "m",
  );
  expect(formatActions([a])).toBe("Meeting Actions\n\nJames\n- Check loading");
});
it("includes duration and meeting name in summary", () =>
  expect(
    formatSummary({
      id: "m",
      name: "Daily handover",
      startedAt: "2026-10-03T09:00:00Z",
      endedAt: "2026-10-03T09:05:00Z",
      status: "complete",
      actions: [],
      transcript: [],
    }),
  ).toContain("Duration: 00:05:00"));
