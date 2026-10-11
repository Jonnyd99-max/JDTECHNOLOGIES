import { capacity, forecast, requiredTools } from "../data/calculations";
import type { CapacityTool } from "../../storage/ToolStorage";

export const reportGroups = { pace: "Pace & Forecast", capacity: "Capacity Calculator", required: "Required Tools" } as const;
export type ReportGroup = keyof typeof reportGroups;
type Stamp = { sentAt: string };
export type ReportInput =
  | { group: "pace"; target: number; actual: number; elapsed: number; remaining: number; multiplier: number; asOf: string; mode: "work" | "manual" }
  | { group: "capacity"; tool: CapacityTool; count: number; remaining: number; asOf: string; mode: "work" | "standard"; library: CapacityTool[] }
  | { group: "required"; tool: CapacityTool; target: number };
export type ReportSnapshot = ReportInput & Stamp;
export type ReportCollection = Partial<Record<ReportGroup, ReportSnapshot>>;
const STORAGE_KEY = "jd.reports.v1";
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const toolValid = (t: unknown): t is CapacityTool => {
  if (!t || typeof t !== "object") return false;
  const tool = t as CapacityTool;
  return typeof tool.id === "string" && !!tool.id && typeof tool.name === "string" && !!tool.name.trim() && finite(tool.capacity24) && tool.capacity24 > 0;
};
export function validSnapshot(value: unknown): value is ReportSnapshot {
  if (!value || typeof value !== "object") return false;
  const s = value as ReportSnapshot;
  if (typeof s.sentAt !== "string" || !Number.isFinite(Date.parse(s.sentAt))) return false;
  if (s.group === "pace") {
    const result = forecast(s.target, s.actual, s.elapsed, s.remaining, s.multiplier);
    return [s.target, s.actual, s.elapsed, s.remaining, s.multiplier].every(finite)
    && (s.mode === "work" || s.mode === "manual") && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.asOf)
    && result !== null && result.finish !== null;
  }
  if (s.group === "capacity") return toolValid(s.tool) && finite(s.count) && finite(s.remaining)
    && !!capacity(s.tool.capacity24, s.count, s.remaining) && (s.mode === "work" || s.mode === "standard")
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.asOf) && Array.isArray(s.library) && s.library.length <= 1000 && s.library.every(toolValid);
  if (s.group === "required") return toolValid(s.tool) && finite(s.target) && !!requiredTools(s.target, s.tool.capacity24);
  return false;
}
export function loadReports(storage: Storage = localStorage): ReportCollection {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return {};
  const data = JSON.parse(raw) as { version?: number; snapshots?: ReportCollection };
  if (data?.version !== 1 || !data.snapshots || typeof data.snapshots !== "object" || Array.isArray(data.snapshots)
    || Object.entries(data.snapshots).some(([key, s]) => !validSnapshot(s) || s.group !== key)) throw new Error("Saved reports could not be read. Existing data has been preserved.");
  return data.snapshots;
}
export function sendReport(input: ReportInput, storage: Storage = localStorage, now = new Date()): ReportSnapshot {
  const snapshot = { ...input, sentAt: now.toISOString() } as ReportSnapshot;
  if (!validSnapshot(snapshot)) throw new Error("Complete valid calculator figures before sending to Reporting.");
  const snapshots = loadReports(storage);
  // Serialize immediately so later edits to the calculator/library cannot mutate the snapshot.
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, snapshots: { ...snapshots, [input.group]: snapshot } }));
  return snapshot;
}
export const reportNumber = (n: number | null, digits = 1) => n === null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: digits });
export function executiveSummary(snapshots: ReportSnapshot[]): string {
  return ["JD Technology | Lumo", "Executive Data Tools Report", ...snapshots.map(s => {
    const header = `${reportGroups[s.group]} · sent ${new Date(s.sentAt).toLocaleString()}`;
    if (s.group === "pace") {
      const r = forecast(s.target, s.actual, s.elapsed, s.remaining, s.multiplier)!;
      return `${header}\nAs of ${s.asOf} · ${s.mode === "work" ? "07:00–07:00 work day" : "Manual period"}\nTarget: ${reportNumber(s.target)} | Actual: ${reportNumber(s.actual)} | Forecast: ${reportNumber(r.finish)} (${reportNumber(r.percent)}%) | Forecast gap: ${reportNumber(r.gap)}\nElapsed: ${reportNumber(s.elapsed)}h | Remaining: ${reportNumber(s.remaining)}h | Future pace adjustment: ${reportNumber((s.multiplier - 1) * 100)}%`;
    }
    if (s.group === "capacity") {
      const r = capacity(s.tool.capacity24, s.count, s.remaining)!;
      return `${header}\n${s.tool.name} · ${s.count} tools · as of ${s.asOf}\nCapacity/tool/24h: ${reportNumber(s.tool.capacity24)} | Total/24h: ${reportNumber(r.total)} | Theoretical remaining: ${reportNumber(r.available)}\nPeriod: ${s.mode === "work" ? "07:00–07:00" : "00:00–00:00"} | Remaining: ${reportNumber(s.remaining)}h`;
    }
    const r = requiredTools(s.target, s.tool.capacity24)!;
    return `${header}\n${s.tool.name} · full 24-hour run\nTarget: ${reportNumber(s.target)} | Tools required: ${r.count} | Capacity: ${reportNumber(r.total)} | Spare: ${reportNumber(r.spare)}`;
  }), "Snapshots are independent. Capacity is theoretical and excludes downtime and rejects."].join("\n\n");
}
