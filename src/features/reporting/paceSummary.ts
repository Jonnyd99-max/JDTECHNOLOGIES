import { forecast } from "../data/calculations";
import { reportNumber as fmt, type ReportSnapshot } from "./reportStorage";

export function paceSummary(s: Extract<ReportSnapshot, { group: "pace" }>) {
  const r = forecast(s.target, s.actual, s.elapsed, s.remaining, s.multiplier)!;
  const remaining = Math.max(0, s.target - s.actual);
  const pace = s.multiplier === 1 ? "Current pace" : "Planned future pace";
  const cushion = r.required && r.required > 0 ? (r.futurePace! / r.required - 1) * 100 : null;
  const takeaway = remaining === 0 ? "Target already achieved at this snapshot."
    : s.remaining === 0 ? "The period has ended with output below target."
    : cushion === null ? "A required pace cannot be calculated."
    : Math.abs(cushion) < .05 ? `${pace} matches the rate needed to finish on target.`
    : `${pace} is ${fmt(Math.abs(cushion))}% ${cushion >= 0 ? "above" : "below"} the rate needed to finish on target.`;
  let completion = remaining === 0 ? "Already achieved" : "Not forecast within this period";
  if (remaining > 0 && r.timeToTarget !== null && r.timeToTarget <= s.remaining + 1e-9) {
    const [hours, minutes] = s.asOf.split(":").map(Number);
    const total = hours * 60 + minutes + Math.ceil(r.timeToTarget * 60);
    const days = Math.floor(total / 1440), clock = total % 1440;
    completion = `${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}${days ? days === 1 ? " next day" : ` (+${days} days)` : ""}`;
  }
  return { takeaway, items: [["Remaining output", fmt(remaining)], ["Required pace / hour", fmt(r.required)], [`${pace} / hour`, fmt(r.futurePace)], ["Estimated target completion", completion]] as [string, string][] };
}
