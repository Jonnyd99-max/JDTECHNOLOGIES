import { mkdirSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createReportPdf, reportPdfFilename } from "./reportPdf";
import type { ReportSnapshot } from "./reportStorage";

const tool = { id: "example", name: "Example Tool", capacity24: 240 };
const snapshots: ReportSnapshot[] = [
  { group: "pace", sentAt: "2026-10-11T12:00:00Z", target: 1000, actual: 513, elapsed: 12, remaining: 12, multiplier: 1, asOf: "19:00", mode: "work" },
  { group: "capacity", sentAt: "2026-10-11T12:00:00Z", tool, count: 5, remaining: 12, asOf: "19:00", mode: "work", library: [tool] },
  { group: "required", sentAt: "2026-10-11T12:00:00Z", tool, target: 1000 },
];
it("exports one complete branded PDF page per selected tool group, without a separate cover", () => {
  const pdf = createReportPdf(snapshots);
  expect(pdf.getNumberOfPages()).toBe(3);
  expect(createReportPdf([snapshots[1]]).getNumberOfPages()).toBe(1);
  expect(new Uint8Array(pdf.output("arraybuffer")).slice(0, 5)).toEqual(new TextEncoder().encode("%PDF-"));
  // Optional local QA artifact; ordinary test runs do not write report files.
  if (process.env.REPORT_PDF_SAMPLE_DIR) {
    mkdirSync(process.env.REPORT_PDF_SAMPLE_DIR, { recursive: true });
    writeFileSync(`${process.env.REPORT_PDF_SAMPLE_DIR}/executive-report-sample.pdf`, Buffer.from(pdf.output("arraybuffer")));
  }
});
it("uses a recognisable dated filename and rejects missing or invalid figures", () => {
  expect(reportPdfFilename([snapshots[0]], new Date(2026, 9, 11, 14, 5, 6))).toBe("JD-Technology-pace-report-2026-10-11-140506.pdf");
  expect(reportPdfFilename(snapshots, new Date(2026, 9, 11, 14, 5, 6))).toContain("all-groups");
  expect(() => createReportPdf([])).toThrow("valid report");
  expect(() => createReportPdf([{ ...snapshots[0], target: -1 } as ReportSnapshot])).toThrow("valid report");
});
