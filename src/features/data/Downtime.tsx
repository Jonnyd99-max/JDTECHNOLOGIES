import { useState } from "react";
import { Link } from "react-router-dom";
import { LocalToolStorage, type CapacityTool } from "../../storage/ToolStorage";
import { Frame } from "./DataTools";
import { downtimeImpact, numberValue } from "./calculations";
import { reportNumber as fmt } from "../reporting/reportStorage";
import { SendToReporting } from "../reporting/SendToReporting";

export function DowntimeCalculator() {
  const [initial] = useState(() => {
    try { return { tools: new LocalToolStorage().load(), error: "" }; }
    catch { return { tools: [] as CapacityTool[], error: "Saved tools could not be loaded. Existing data has been preserved; reload to retry." }; }
  });
  const [selected, setSelected] = useState("");
  const [count, setCount] = useState("1");
  const [entries, setEntries] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const tool = initial.tools.find(t => t.id === selected);
  const n = numberValue(count, true);
  const validCount = n !== null && Number.isInteger(n) && n <= 1000;
  const values = validCount ? Array.from({ length: n }, (_, i) => entries[i] ?? "0") : [];
  const minutes = values.map(value => numberValue(value));
  const result = tool && validCount && minutes.every(value => value !== null) ? downtimeImpact(tool.capacity24, minutes as number[]) : null;
  const amount = target === "" ? null : numberValue(target);
  const targetValid = target === "" || amount !== null;
  return <Frame title="Downtime Impact">
    {initial.error && <p className="banner error-banner" role="alert">{initial.error}</p>}
    <section className="data-panel">
      <Link className="text-button" to="/data/capacity">Add or edit tool capacities →</Link>
      <label className="data-field"><span>Select tool group</span><select value={selected} onChange={e => { setSelected(e.target.value); setEntries([]); }}><option value="">Select a tool group</option>{initial.tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      {!initial.tools.length && !initial.error && <p className="muted">Add your tool groups in Capacity Calculator’s Manage Tools section first.</p>}
      <div className="data-kpis"><div><span className="muted">Saved capacity per tool / 24 hours</span><strong>{fmt(tool?.capacity24 ?? null)}</strong></div><div><span className="muted">Capacity per tool / hour</span><strong>{fmt(tool ? tool.capacity24 / 24 : null)}</strong></div></div>
      <label className="data-field"><span>Number of tools</span><input type="number" inputMode="numeric" min="1" max="1000" step="1" value={count} aria-invalid={!validCount} onChange={e => setCount(e.target.value)} />{!validCount && <small role="alert">Enter a whole number from 1 to 1,000.</small>}</label>
      <label className="data-field"><span>24-hour target (optional)</span><input type="number" inputMode="decimal" min="0" step="any" value={target} aria-invalid={!targetValid} onChange={e => setTarget(e.target.value)} />{!targetValid && <small role="alert">Enter a non-negative target.</small>}</label>
      <p className="muted">All tools start at 100% uptime. Enter each tool’s total downtime minutes within the same 24-hour run. Changing tool group starts a new set of downtime entries.</p>
    </section>
    {tool && validCount && <section className="data-panel"><h2>Downtime by tool</h2><p className="muted">0 minutes means a full 24-hour run. Maximum downtime is 1,440 minutes per tool.</p>
      {values.map((value, i) => {
        const invalid = minutes[i] === null || minutes[i]! > 1440;
        const row = !invalid ? downtimeImpact(tool.capacity24, [minutes[i]!])?.rows[0] : null;
        return <div className="downtime-row" key={i}><label className="data-field"><span>{tool.name} {i + 1} · downtime minutes</span><input type="number" inputMode="decimal" min="0" max="1440" step="any" value={value} aria-invalid={invalid} onChange={e => setEntries(old => { const next = Array.from({ length: Math.max(old.length, i + 1) }, (_, j) => old[j] ?? "0"); next[i] = e.target.value; return next; })} />{invalid && <small role="alert">Enter downtime from 0 to 1,440 minutes.</small>}</label><div className="downtime-output"><strong>{fmt(row?.output ?? null)} output</strong><span className="muted">{fmt(row?.uptime ?? null)}% uptime · {fmt(row?.lost ?? null)} lost</span></div></div>;
      })}
    </section>}
    <section className="data-panel" aria-live="polite"><div className="data-result"><p className="eyebrow">ADJUSTED 24-HOUR OUTPUT</p><strong>{fmt(result?.output ?? null)}</strong></div><div className="data-kpis">{[["Full 24-hour capacity", fmt(result?.total ?? null)], ["Estimated lost output", fmt(result?.lost ?? null)], ["Overall uptime", result ? `${fmt(result.uptime)}%` : "—"], ["Total tool downtime", result ? `${fmt(result.minutes)} minutes` : "—"]].map(([label, value]) => <div key={label}><span className="muted">{label}</span><strong>{value}</strong></div>)}</div>
      {result && amount !== null && <p>{fmt(Math.abs(result.output - amount))} {result.output >= amount ? "capacity above target" : "below target"}.</p>}
      <p className="muted">Estimated output at the saved constant production rate, allowing for the downtime entered. Rejects and speed changes are not included. Total tool downtime adds each tool’s minutes, including overlapping stops.</p>
    </section>
    <SendToReporting input={tool && result && targetValid ? { group: "downtime", tool, minutes: minutes as number[], target: amount } : null} />
  </Frame>;
}
