import { jsPDF } from "jspdf";
import { capacity, forecast, requiredTools, status } from "../data/calculations";
import { reportGroups, reportNumber as fmt, validSnapshot, type ReportSnapshot } from "./reportStorage";

const clean = (text: string) => text.replace(/[–—]/g, "-").replace(/→/g, "to").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/·/g, "|");
export function reportPdfFilename(snapshots: ReportSnapshot[], now = new Date()) {
  const group = snapshots.length === 1 ? snapshots[0].group : "all-groups";
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `JD-Technology-${group}-report-${date}-${time}.pdf`;
}

export function createReportPdf(snapshots: ReportSnapshot[]): jsPDF {
  if (!snapshots.length || snapshots.some(s => !validSnapshot(s))) throw new Error("No valid report figures to export.");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  pdf.setProperties({ title: "JD Technology - Executive Data Tools Report", author: "JD Technology | Lumo", subject: snapshots.map(s => reportGroups[s.group]).join(", ") });
  const text = (value: string, x: number, y: number, size = 10, bold = false, width = 175) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size); pdf.setTextColor(30, 38, 50);
    let label = clean(value);
    while (pdf.getTextWidth(label) > width && size > 7) { size -= .5; pdf.setFontSize(size); }
    if (pdf.getTextWidth(label) > width) {
      while (label.length && pdf.getTextWidth(`${label}...`) > width) label = label.slice(0, -1);
      label += "...";
    }
    pdf.text(label, x, y);
  };
  snapshots.forEach((s, index) => {
    if (index) pdf.addPage();
    // Brand, group and compact orb are repeated on the same page as the figures.
    pdf.setFillColor(246, 248, 251); pdf.roundedRect(14, 14, 182, 43, 3, 3, "F");
    pdf.setDrawColor(244, 119, 33); pdf.setLineWidth(.8); pdf.line(18, 15, 192, 15);
    text("JD TECHNOLOGY", 20, 25, 10, true, 140);
    text("Executive overview", 20, 35, 20, true, 140);
    text(`Data Tools | ${reportGroups[s.group]}`, 20, 45, 11, true, 140);
    text(`Snapshot sent: ${new Date(s.sentAt).toLocaleString()}`, 20, 52, 8, false, 140);
    // Vector shading keeps the orb sharp without browser screenshots or network assets.
    for (let ring = 24; ring >= 0; ring--) {
      const t = ring / 24;
      pdf.setFillColor(Math.round(255 - t * 29), Math.round(193 - t * 83), Math.round(113 - t * 79));
      pdf.circle(179 - (1 - t) * 1.2, 32 - (1 - t) * 1.2, 5.8 * t + .1, "F");
    }
    text("Lumo", 174, 45, 9, true, 20);

    let metrics: [string, string][];
    let rows: [string, string][];
    let bars: { label: string; value: number; suffix?: string }[];
    let note: string;
    let marker: number | undefined;
    if (s.group === "pace") {
      const r = forecast(s.target, s.actual, s.elapsed, s.remaining, s.multiplier)!;
      metrics = [["Target", fmt(s.target)], ["Actual", fmt(s.actual)], ["Forecast", fmt(r.finish)], ["Attainment", `${fmt(r.percent)}%`]];
      bars = [{ label: "Actual", value: s.actual / s.target * 100, suffix: "%" }, { label: "Forecast", value: r.percent!, suffix: "%" }]; marker = 100;
      rows = [["Time basis", s.mode === "work" ? "07:00 to 07:00 | 24-hour work day" : "Manual period"], ["As of", s.asOf], ["Hours elapsed / remaining", `${fmt(s.elapsed)} / ${fmt(s.remaining)}`], ["Current output / hour", fmt(r.currentPace)], ["Required output / hour", fmt(r.required)], ["Future pace adjustment", `${fmt((s.multiplier - 1) * 100)}%`], ["Forecast gap to target", `${r.gap! > 0 ? "+" : ""}${fmt(r.gap)}`], ["Forecast status", status(r.percent!)]];
      note = "Forecast based on the selected future pace, not a guaranteed outcome. The dashed marker indicates 100% of target.";
    } else if (s.group === "capacity") {
      const r = capacity(s.tool.capacity24, s.count, s.remaining)!;
      metrics = [["Tools in run", fmt(s.count, 0)], ["Capacity / 24h", fmt(r.total)], ["Remaining capacity", fmt(r.available)], ["Hours remaining", fmt(s.remaining)]];
      bars = [{ label: "Full 24-hour capacity", value: r.total }, { label: "Theoretical capacity remaining", value: r.available }];
      rows = [["Selected tool", s.tool.name], ["Capacity per tool / 24 hours", fmt(s.tool.capacity24)], ["Number of tools", fmt(s.count, 0)], ["Period", s.mode === "work" ? "07:00 to 07:00" : "00:00 to 00:00"], ["As of", s.asOf], ["Hours elapsed / remaining", `${fmt(24 - s.remaining)} / ${fmt(s.remaining)}`], ["Total 24-hour capacity", fmt(r.total)], ["Theoretical remaining capacity", fmt(r.available)]];
      note = "Theoretical capacity at a constant rate. Actual production, downtime and rejects are not measured here.";
    } else {
      const r = requiredTools(s.target, s.tool.capacity24)!;
      metrics = [["Target / 24h", fmt(s.target)], ["Tools required", fmt(r.count, 0)], ["Resulting capacity", fmt(r.total)], ["Spare capacity", fmt(r.spare)]];
      bars = [{ label: "Target", value: s.target }, { label: "Capacity with required tools", value: r.total }];
      rows = [["Selected tool", s.tool.name], ["Capacity per tool / 24 hours", fmt(s.tool.capacity24)], ["Target", fmt(s.target)], ["Tools required", fmt(r.count, 0)], ["Resulting capacity", fmt(r.total)], ["Capacity above target", fmt(r.spare)], ["Run duration", "24 hours"]];
      note = "Whole tools rounded up for a full 24-hour run. Theoretical capacity excludes downtime and rejects.";
    }
    metrics.forEach(([label, value], i) => {
      const x = 14 + i * 46.5;
      pdf.setFillColor(255, 246, 238); pdf.roundedRect(x, 64, 42.5, 23, 2, 2, "F");
      text(label, x + 3, 71, 8, false, 36); text(value, x + 3, 81, 15, true, 36);
    });
    text(s.group === "pace" ? "Target attainment" : "Output capacity comparison", 14, 99, 11, true);
    const maximum = Math.max(1, marker || 0, ...bars.map(b => b.value));
    bars.forEach((bar, i) => {
      const y = 110 + i * 19;
      text(bar.label, 14, y, 9, false, 110);
      const value = `${fmt(bar.value)}${bar.suffix || ""}`;
      pdf.setFontSize(9); text(value, 196 - Math.min(70, pdf.getTextWidth(value)), y, 9, true, 70);
      pdf.setFillColor(235, 239, 243); pdf.roundedRect(14, y + 3, 182, 5, 2, 2, "F");
      pdf.setFillColor(...(i === 0 ? [244, 119, 33] : [83, 158, 189]) as [number, number, number]);
      if (bar.value > 0) pdf.roundedRect(14, y + 3, bar.value / maximum * 182, 5, Math.min(2, bar.value / maximum * 91), 2, "F");
    });
    if (marker !== undefined) {
      const x = 14 + marker / maximum * 182;
      pdf.setDrawColor(30, 38, 50); pdf.setLineDashPattern([1, 1], 0); pdf.line(x, 113, x, 118); pdf.line(x, 132, x, 137); pdf.setLineDashPattern([], 0);
      text("100% target", Math.max(14, x - 20), 145, 8, false, 30);
    }
    text("Snapshot figures and assumptions", 14, 156, 11, true);
    let y = 162;
    rows.forEach(([label, value], i) => {
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
      const wrapped: string[] = pdf.splitTextToSize(clean(value), 84);
      const h = Math.max(9, wrapped.length * 4.1 + 4);
      pdf.setFillColor(...(i % 2 ? [255, 255, 255] : [246, 248, 251]) as [number, number, number]);
      pdf.rect(14, y, 182, h, "F"); text(label, 18, y + 5.8, 9, false, 82);
      pdf.setFontSize(9); pdf.text(wrapped, 105, y + 5.8);
      y += h;
    });
    pdf.setFontSize(8); pdf.setTextColor(85, 96, 111); pdf.text(pdf.splitTextToSize(note, 182), 14, y + 9);
    pdf.setDrawColor(210, 216, 224); pdf.line(14, 277, 196, 277);
    text("JD Technology | Lumo | Device-local snapshot", 14, 283, 8, false, 145);
    text(`Page ${index + 1} of ${snapshots.length}`, 174, 283, 8, false, 24);
  });
  return pdf;
}
