import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Orb } from "../../components/Orb";
import { copyText } from "../../services/clipboard";
import { capacity, forecast, requiredTools, status } from "../data/calculations";
import { executiveSummary, loadReports, reportGroups, reportNumber as fmt, type ReportCollection, type ReportGroup, type ReportSnapshot } from "./reportStorage";
import "./reporting.css";

function Metrics({ items }: { items: [string, string][] }) {
  return <dl className="report-metrics">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
function Table({ rows }: { rows: [string, string][] }) {
  return <div className="report-table-wrap"><table className="report-table"><caption>Snapshot figures and assumptions</caption><thead><tr><th scope="col">Measure</th><th scope="col">Value</th></tr></thead><tbody>{rows.map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{value}</td></tr>)}</tbody></table></div>;
}
function Bars({ title, rows, marker }: { title: string; rows: { label: string; value: number; suffix?: string }[]; marker?: number }) {
  const max = Math.max(1, marker || 0, ...rows.map(row => row.value));
  const height = 40 + rows.length * 62;
  return <figure className="report-chart"><figcaption>{title}</figcaption>
    <svg viewBox={`0 0 600 ${height}`} role="img" aria-label={`${title}. ${rows.map(r => `${r.label}: ${fmt(r.value)}${r.suffix || ""}`).join(". ")}${marker !== undefined ? `. Target marker: ${marker}%` : ""}`}>
      {rows.map((row, index) => <g key={row.label}>
        <text x="0" y={22 + index * 62} className="report-chart-label">{row.label}</text>
        <text x="595" y={22 + index * 62} textAnchor="end" className="report-chart-value">{fmt(row.value)}{row.suffix}</text>
        <rect x="0" y={32 + index * 62} width="595" height="16" rx="8" className="report-bar-track" />
        <rect x="0" y={32 + index * 62} width={row.value / max * 595} height="16" rx="8" className={`report-bar-value report-bar-${index}`} />
      </g>)}
      {marker !== undefined && <g><line x1={marker / max * 595} x2={marker / max * 595} y1="28" y2={rows.length * 62 - 8} className="report-target-marker" /><text x={Math.min(595, marker / max * 595)} y={height - 6} textAnchor="end" className="report-chart-label">100% target</text></g>}
    </svg>
  </figure>;
}
function Snapshot({ data }: { data: ReportSnapshot }) {
  let metrics: [string, string][];
  let table: [string, string][];
  let chart: React.ReactNode;
  let note: string;
  if (data.group === "pace") {
    const r = forecast(data.target, data.actual, data.elapsed, data.remaining, data.multiplier)!;
    metrics = [["Target", fmt(data.target)], ["Actual", fmt(data.actual)], ["Forecast", fmt(r.finish)], ["Forecast attainment", `${fmt(r.percent)}%`]];
    table = [["As of", data.asOf], ["Time basis", data.mode === "work" ? "07:00 → 07:00 · 24-hour work day" : "Manual period"], ["Hours elapsed", fmt(data.elapsed)], ["Hours remaining", fmt(data.remaining)], ["Current output / hour", fmt(r.currentPace)], ["Required output / hour", fmt(r.required)], ["Future pace adjustment", `${fmt((data.multiplier - 1) * 100)}%`], ["Forecast gap to target", `${r.gap! > 0 ? "+" : ""}${fmt(r.gap)}`], ["Forecast status", status(r.percent!)]];
    chart = <Bars title="Target attainment · actual and forecast" marker={100} rows={[{ label: "Actual", value: Math.min(Number.MAX_VALUE, data.actual / data.target * 100), suffix: "%" }, { label: "Forecast", value: r.percent!, suffix: "%" }]} />;
    note = `Forecast ${status(r.percent!).toLowerCase()}. Based on the selected future pace, not a guaranteed outcome.`;
  } else if (data.group === "capacity") {
    const r = capacity(data.tool.capacity24, data.count, data.remaining)!;
    metrics = [["Selected tool", data.tool.name], ["Tools in run", fmt(data.count, 0)], ["24-hour capacity", fmt(r.total)], ["Capacity remaining", fmt(r.available)]];
    table = [["Capacity per tool / 24 hours", fmt(data.tool.capacity24)], ["As of", data.asOf], ["Period", data.mode === "work" ? "07:00 → 07:00" : "00:00 → 00:00"], ["Hours elapsed", fmt(24 - data.remaining)], ["Hours remaining", fmt(data.remaining)], ["Total 24-hour capacity", fmt(r.total)], ["Theoretical remaining capacity", fmt(r.available)]];
    chart = <Bars title="Selected run · output capacity" rows={[{ label: "Full 24-hour capacity", value: r.total }, { label: "Theoretical capacity remaining", value: r.available }]} />;
    note = "Theoretical capacity at a constant rate. Actual production, downtime and rejects are not measured here.";
  } else {
    const r = requiredTools(data.target, data.tool.capacity24)!;
    metrics = [["24-hour target", fmt(data.target)], ["Tools required", fmt(r.count, 0)], ["Resulting capacity", fmt(r.total)], ["Spare capacity", fmt(r.spare)]];
    table = [["Tool group", data.tool.name], ["Capacity per tool / 24 hours", fmt(data.tool.capacity24)], ["Target", fmt(data.target)], ["Tools required", fmt(r.count, 0)], ["Resulting capacity", fmt(r.total)], ["Capacity above target", fmt(r.spare)], ["Run duration", "24 hours"]];
    chart = <Bars title="Target and planned output capacity" rows={[{ label: "Target", value: data.target }, { label: "Capacity with required tools", value: r.total }]} />;
    note = "Whole tools rounded up for a full 24-hour run. Theoretical capacity excludes downtime and rejects.";
  }
  return <article className="report-section" aria-labelledby={`report-${data.group}`}>
    <div className="report-section-heading"><div><p className="eyebrow">DATA TOOLS · {data.group === "pace" ? "PRODUCTION PACE" : data.tool.name}</p><h2 id={`report-${data.group}`}>{reportGroups[data.group]}</h2></div><p className="report-sent">Sent <time dateTime={data.sentAt}>{new Date(data.sentAt).toLocaleString()}</time></p></div>
    <Metrics items={metrics} />
    <div className="report-detail-grid">{chart}<Table rows={table} /></div>
    {data.group === "capacity" && data.library.length > 1 && <details className="report-library"><summary>Saved tool capacities included in this snapshot ({data.library.length})</summary><div className="report-table-wrap"><table className="report-table"><caption>Capacity per individual tool · not combined production</caption><thead><tr><th scope="col">Tool</th><th scope="col">Output / 24 hours</th></tr></thead><tbody>{data.library.map(tool => <tr key={tool.id}><th scope="row">{tool.name}</th><td>{fmt(tool.capacity24)}</td></tr>)}</tbody></table></div></details>}
    <p className="muted report-note">{note}</p>
  </article>;
}
export function ReportingScreen() {
  const [reports, setReports] = useState<ReportCollection>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [group, setGroup] = useState<ReportGroup | "all">("all");
  const [exporting, setExporting] = useState(false);
  const [download, setDownload] = useState<{ url: string; filename: string } | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (download) URL.revokeObjectURL(download.url); }, [download]);
  useEffect(() => {
    const refresh = () => { try { setReports(loadReports()); setError(""); } catch { setError("Saved reports could not be loaded. Existing data has been preserved. Check device storage and reload."); } };
    refresh(); window.addEventListener("storage", refresh); window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  const all = (Object.keys(reportGroups) as ReportGroup[]).flatMap(key => reports[key] ? [reports[key]!] : []);
  const shown = all.filter(s => group === "all" || s.group === group);
  async function downloadPdf() {
    if (exporting || !shown.length) return;
    setExporting(true); setMessage("Preparing your PDF on this device…");
    try {
      const { createReportPdf, reportPdfFilename } = await import("./reportPdf");
      const pdf = createReportPdf(shown);
      if (!mounted.current) return;
      const filename = reportPdfFilename(shown), url = URL.createObjectURL(pdf.output("blob"));
      setDownload({ url, filename });
      const link = document.createElement("a"); link.href = url; link.download = filename;
      document.body.appendChild(link); link.click(); link.remove();
      setMessage(`PDF ready: ${filename}. Check your browser's Downloads. You can download it again or open it below.`);
    } catch { if (mounted.current) setMessage("Could not create the PDF. Try again or copy the executive summary."); }
    finally { if (mounted.current) setExporting(false); }
  }
  return <div className="reporting-page">
    <Link className="text-button report-controls" to="/">← Workspace</Link>
    <header className="report-header"><div><p className="eyebrow">JD TECHNOLOGY</p><h1>Executive overview</h1><p className="report-subtitle">Data Tools report · {group === "all" ? "All submitted tool groups" : reportGroups[group]}</p><p className="muted">Latest snapshot from each tool group. Figures stay as sent until you send an update.</p></div><div className="report-lumo"><Orb small /><span>Lumo</span></div></header>
    {error && <p className="banner error-banner" role="alert">{error}</p>}
    <div className="report-toolbar report-controls"><div role="group" aria-label="Report tool group" className="report-filters">{(["all", ...Object.keys(reportGroups)] as (ReportGroup | "all")[]).map(key => <button key={key} disabled={exporting} className={`button ${group === key ? "primary" : "secondary"} small`} aria-pressed={group === key} onClick={() => setGroup(key)}>{key === "all" ? "All groups" : reportGroups[key]}</button>)}</div>
      <div className="inline-buttons"><button className="button primary small" disabled={!shown.length || !!error || exporting} onClick={() => void downloadPdf()}>{exporting ? "Preparing PDF…" : "Download PDF"}</button><button className="button secondary small" disabled={!shown.length || !!error} onClick={() => { void copyText(executiveSummary(shown)).then(() => setMessage("Executive summary copied.")).catch(() => setMessage("Could not copy the summary. Try Download PDF instead.")); }}>Copy executive summary</button></div>
    </div>
    {message && <p className="report-controls" role="status">{message}</p>}
    {download && <div className="report-download report-controls"><strong>{download.filename}</strong><div className="inline-buttons"><a className="button secondary small" href={download.url} download={download.filename}>Download again</a><a className="button secondary small" href={download.url} target="_blank" rel="noopener noreferrer">Open PDF</a></div><p className="muted">Each tool group includes its own complete branded report page. Your browser controls where downloads are saved.</p></div>}
    {!error && !shown.length && <section className="report-empty"><h2>{all.length ? "This tool group has not been sent yet." : "Your executive dashboard starts with Data Tools."}</h2><p>Open Pace & Forecast, Capacity Calculator or Required Tools, enter your figures, then press Send to Reporting.</p><Link className="button primary" to="/data">Open Data Tools</Link></section>}
    {!error && shown.map(snapshot => <Snapshot key={snapshot.group} data={snapshot} />)}
    <footer className="report-footer">JD Technology · Lumo · Device-local report. Snapshots may have different dates, periods and targets; they are not combined totals.</footer>
  </div>;
}
