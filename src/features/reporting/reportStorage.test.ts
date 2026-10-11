// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { executiveSummary, loadReports, sendReport, type ReportInput } from "./reportStorage";
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
const tool = { id: "a", name: "Tool A", capacity24: 100 };
const pace: ReportInput = { group: "pace", target: 100, actual: 50, elapsed: 12, remaining: 12, multiplier: 1, asOf: "19:00", mode: "work" };
it("replaces only the sent group and preserves independent immutable snapshots", () => {
  sendReport(pace, localStorage, new Date("2026-10-11T12:00:00Z"));
  sendReport({ group: "required", tool, target: 201 });
  tool.name = "Renamed";
  sendReport({ ...pace, actual: 60 });
  const reports = loadReports();
  expect(Object.keys(reports)).toHaveLength(2);
  expect(reports.pace).toMatchObject({ actual: 60 });
  expect(reports.required).toMatchObject({ tool: { name: "Tool A" }, target: 201 });
  tool.name = "Tool A";
});
it("supports zero production and a zero required-tools target", () => {
  sendReport({ ...pace, actual: 0 });
  sendReport({ group: "required", tool, target: 0 });
  expect(Object.keys(loadReports())).toHaveLength(2);
});
it("does not overwrite reports when storage is malformed or a calculation is invalid", () => {
  localStorage.setItem("jd.reports.v1", "malformed");
  expect(() => sendReport(pace)).toThrow();
  expect(localStorage.getItem("jd.reports.v1")).toBe("malformed");
  localStorage.clear();
  expect(() => sendReport({ ...pace, elapsed: 0 })).toThrow("valid calculator");
  expect(() => sendReport({ group: "capacity", tool, count: 1.5, remaining: 12, asOf: "12:00", mode: "work", library: [tool] })).toThrow("valid calculator");
});
it("rejects unsupported calculator groups and propagates storage failures", () => {
  localStorage.setItem("jd.reports.v1", JSON.stringify({ version: 1, snapshots: { percentage: { group: "percentage", sentAt: new Date().toISOString() } } }));
  expect(() => loadReports()).toThrow("preserved");
  localStorage.clear();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
  expect(() => sendReport(pace)).toThrow("full");
});
it("exports branded figures and assumptions without adding unrelated group totals", () => {
  const snapshot = sendReport({ group: "required", tool, target: 201 });
  const text = executiveSummary([snapshot]);
  expect(text).toContain("JD Technology | Lumo");
  expect(text).toContain("Tools required: 3");
  expect(text).toContain("Spare: 99");
  expect(text).toContain("Snapshots are independent");
});
