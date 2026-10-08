import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Gauge, Percent, Factory, ArrowRight } from "lucide-react";
import { Modal, PageHeading } from "../../components/UI";
import { Orb } from "../../components/Orb";
import {
  LocalToolStorage,
  validateTool,
  type CapacityTool,
} from "../../storage/ToolStorage";
import {
  capacity,
  completionTime,
  forecast,
  localTime,
  numberValue,
  percentage,
  periodAt,
  requiredTools,
  status,
  type PercentageMode,
} from "./calculations";
import "./data.css";

const format = (value: number | null, digits = 1) =>
  value !== null && Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "—";
function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="data-tools">
      <div className="data-heading">
        <PageHeading eyebrow="DATA TOOLS" title={title} back="/data" />
        <Orb small />
      </div>
      {children}
    </div>
  );
}
function Numeric({
  label,
  value,
  onChange,
  positive = false,
  integer = false,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  positive?: boolean;
  integer?: boolean;
}) {
  const invalid =
    value !== "" &&
    (numberValue(value, positive) === null ||
      (integer && !Number.isInteger(Number(value))));
  return (
    <label className="data-field">
      <span>{label}</span>
      <input
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min={positive ? (integer ? 1 : "0.000001") : 0}
        step={integer ? 1 : "any"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
      />
      {invalid && (
        <small role="alert">
          Enter a valid {positive ? "positive " : "non-negative "}
          {integer ? "whole number" : "number"}.
        </small>
      )}
    </label>
  );
}
function Options({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: [string, string][];
  value: string;
  onChange(value: string): void;
}) {
  return (
    <div className="data-options" role="group" aria-label={label}>
      {choices.map(([id, title]) => (
        <button
          key={id}
          type="button"
          aria-pressed={id === value}
          onClick={() => onChange(id)}
        >
          {title}
        </button>
      ))}
    </div>
  );
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function AsOf({
  value,
  onChange,
}: {
  value: string;
  onChange(value: string): void;
}) {
  return (
    <label className="data-field">
      <span>As of time</span>
      <input
        type="time"
        value={value}
        onInput={(e) => onChange(e.currentTarget.value)}
        onChange={(e) => onChange(e.target.value)}
      />
      <small className="muted">Snapshot time · local device time</small>
    </label>
  );
}
export function DataToolsHome() {
  const cards = [
    {
      path: "pace",
      title: "Pace & Forecast",
      description: "Are you on track?",
      Icon: Gauge,
    },
    {
      path: "percentage",
      title: "Percentage Calculator",
      description: "Fast percentage calculations",
      Icon: Percent,
    },
    {
      path: "capacity",
      title: "Capacity Calculator",
      description: "Understand available capacity",
      Icon: Factory,
    },
    {
      path: "required-tools",
      title: "Required Tools",
      description: "Tools needed to achieve your 24-hour target",
      Icon: Factory,
    },
  ];
  return (
    <div className="data-tools">
      <div className="data-heading">
        <PageHeading
          eyebrow="YOUR WORKSPACE"
          title="Data Tools"
          description="Clear figures. Better decisions."
          back="/"
        />
        <Orb small />
      </div>
      <div className="data-cards">
        {cards.map(({ path, title, description, Icon }) => (
          <Link className="data-card" to={`/data/${path}`} key={path}>
            <Icon size={26} className="orange" />
            <div>
              <h2>{title}</h2>
              <p className="muted">{description}</p>
            </div>
            <ArrowRight size={20} />
          </Link>
        ))}
      </div>
    </div>
  );
}
function Dial({
  percent,
  finish,
  target,
}: {
  percent: number | null;
  finish: number | null;
  target: number;
}) {
  const maximum = Math.max(100, percent ?? 100);
  const angle = Math.PI * (1 - 100 / maximum),
    markerX = 150 + 118 * Math.cos(angle),
    markerY = 140 - 118 * Math.sin(angle);
  return (
    <div className="forecast-dial">
      <svg
        viewBox="0 0 300 165"
        role="img"
        aria-label={`Forecast ${format(percent)} percent; target 100 percent; scale zero to ${format(maximum)} percent`}
      >
        <path
          className="dial-track"
          d="M 25 140 A 125 125 0 0 1 275 140"
          pathLength={maximum}
        />
        <path
          className="dial-value"
          d="M 25 140 A 125 125 0 0 1 275 140"
          pathLength={maximum}
          strokeDasharray={`${Math.max(0, percent ?? 0)} ${maximum}`}
        />
        <line
          x1={markerX}
          y1={markerY}
          x2={150 + 138 * Math.cos(angle)}
          y2={140 - 138 * Math.sin(angle)}
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="275" y="14" textAnchor="end">
          100% TARGET
        </text>
        <text x="25" y="162">
          0%
        </text>
        <text x="275" y="162" textAnchor="end">
          {format(maximum)}%
        </text>
      </svg>
      <div className="dial-number">
        <span className="eyebrow">FORECAST</span>
        <strong>
          {format(percent)}
          {percent !== null && "%"}
        </strong>
        <span>
          {format(finish, 0)} / {format(target, 0)}
        </span>
      </div>
    </div>
  );
}
export function PaceCalculator() {
  const [target, setTarget] = useState("");
  const [actual, setActual] = useState("");
  const [mode, setMode] = useState("work");
  const [time, setTime] = useState(localTime);
  const [elapsed, setElapsed] = useState("");
  const [remaining, setRemaining] = useState("");
  const [scenario, setScenario] = useState("1");
  const period = periodAt(time),
    e = mode === "work" ? (period?.elapsed ?? null) : numberValue(elapsed),
    r = mode === "work" ? (period?.remaining ?? null) : numberValue(remaining);
  const t = numberValue(target, true),
    a = numberValue(actual);
  const result =
    period && t !== null && a !== null && e !== null && r !== null
      ? forecast(t, a, e, r, Number(scenario))
      : null;
  const completion = !result
    ? "Enter your figures to forecast completion."
    : a! >= t!
      ? "TARGET ACHIEVED"
      : result.timeToTarget === null ||
          !period ||
          completionTime(period.asOf, result.timeToTarget) === null
        ? "TARGET COMPLETION CANNOT CURRENTLY BE FORECAST"
        : result.timeToTarget > r!
          ? `TARGET NOT FORECAST WITHIN THIS ${mode === "work" ? "WORK DAY" : "PERIOD"}`
          : null;
  const minutes =
    result?.timeToTarget === null || result?.timeToTarget === undefined
      ? 0
      : Math.ceil(result.timeToTarget * 60);
  return (
    <Frame title="Pace & Forecast">
      <section className="data-panel">
        <div className="data-inputs">
          <Numeric
            label="Target"
            value={target}
            onChange={setTarget}
            positive
          />
          <Numeric label="Current actual" value={actual} onChange={setActual} />
        </div>
        <Options
          label="Time mode"
          choices={[
            ["work", "Work Day"],
            ["manual", "Manual Time"],
          ]}
          value={mode}
          onChange={setMode}
        />
        <AsOf value={time} onChange={setTime} />
        {mode === "work" ? (
          <p className="muted">07:00 → 07:00 · 24-hour production day</p>
        ) : (
          <div className="data-inputs">
            <Numeric
              label="Hours elapsed"
              value={elapsed}
              onChange={setElapsed}
            />
            <Numeric
              label="Hours remaining"
              value={remaining}
              onChange={setRemaining}
            />
          </div>
        )}
      </section>
      <section className="data-panel" aria-live="polite">
        <Dial
          percent={result?.percent ?? null}
          finish={result?.finish ?? null}
          target={t ?? 0}
        />
        <p className="data-status">
          {result?.percent !== null && result?.percent !== undefined
            ? status(result.percent)
            : "Enter target, actual and time"}
        </p>
        <Options
          label="Future pace scenario"
          choices={[
            ["0.8", "−20%"],
            ["0.9", "−10%"],
            ["1", "Current"],
            ["1.1", "+10%"],
            ["1.2", "+20%"],
          ]}
          value={scenario}
          onChange={setScenario}
        />
        <p className="muted">Adjustments apply only to future production.</p>
        <div className="data-kpis">
          <Kpi label="Current" value={format(a)} />
          <Kpi label="Target" value={format(t)} />
          <Kpi label="Forecast" value={format(result?.finish ?? null)} />
          <Kpi
            label="Gap"
            value={`${result && result.gap !== null && result.gap > 0 ? "+" : ""}${format(result?.gap ?? null)}`}
          />
          <Kpi
            label="Current pace / hour"
            value={format(result?.currentPace ?? null)}
          />
          <Kpi
            label="Required pace / hour"
            value={format(result?.required ?? null)}
          />
          <Kpi label="Hours elapsed" value={format(e)} />
          <Kpi label="Hours remaining" value={format(r)} />
        </div>
        <div className="completion">
          <p className="eyebrow">ESTIMATED TARGET COMPLETION</p>
          {completion || !period ? (
            <p>{completion || "Select an as of time."}</p>
          ) : (
            <>
              <strong>
                {completionTime(period.asOf, result!.timeToTarget!)}
              </strong>
              <p>
                {Math.floor(minutes / 60)}h {minutes % 60}m to target
              </p>
            </>
          )}
        </div>
        {result?.gap !== null && result?.gap !== undefined && (
          <p>
            On {scenario === "1" ? "current" : "selected future"} pace you are
            forecast to finish {format(Math.abs(result.gap))}{" "}
            {result.gap < 0 ? "below" : result.gap > 0 ? "above" : "at"} target.
          </p>
        )}
      </section>
    </Frame>
  );
}
export function PercentageCalculator() {
  const [mode, setMode] = useState<PercentageMode>("attainment"),
    [first, setFirst] = useState(""),
    [second, setSecond] = useState("");
  const labels: Record<PercentageMode, [string, string]> = {
    attainment: ["Actual", "Target"],
    change: ["Old value", "New value"],
    of: ["Percentage", "Value"],
    difference: ["Value A", "Value B"],
  };
  const a = numberValue(first),
    b = numberValue(second),
    value = a !== null && b !== null ? percentage(mode, a, b) : null;
  return (
    <Frame title="Percentage Calculator">
      <section className="data-panel">
        <Options
          label="Calculation"
          choices={[
            ["attainment", "Target attainment"],
            ["change", "Percentage change"],
            ["of", "Percentage of"],
            ["difference", "Percentage difference"],
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v as PercentageMode);
            setFirst("");
            setSecond("");
          }}
        />
        <div className="data-inputs">
          <Numeric label={labels[mode][0]} value={first} onChange={setFirst} />
          <Numeric
            label={labels[mode][1]}
            value={second}
            onChange={setSecond}
          />
        </div>
        <div className="data-result" aria-live="polite">
          <p className="eyebrow">RESULT</p>
          <strong>
            {format(value, 2)}
            {value !== null && mode !== "of" && "%"}
          </strong>
          {value !== null && a !== null && b !== null && (
            <p>
              {mode === "attainment"
                ? `${format(Math.abs(b - a))} ${a > b ? "above target" : "remaining"}`
                : mode === "change"
                  ? value > 0
                    ? "Increase"
                    : value < 0
                      ? "Decrease"
                      : "No Change"
                  : mode === "difference"
                    ? `Absolute difference: ${format(Math.abs(a - b))}`
                    : `${format(a)}% of ${format(b)}`}
            </p>
          )}
          {a !== null && b !== null && value === null && (
            <p role="alert">
              Cannot calculate with a zero denominator or values this large.
            </p>
          )}
        </div>
      </section>
    </Frame>
  );
}
export function RequiredToolsCalculator() {
  const [initial] = useState(() => {
    try {
      return { tools: new LocalToolStorage().load(), error: "" };
    } catch {
      return {
        tools: [] as CapacityTool[],
        error:
          "Stored tools could not be loaded. Data has been preserved; reload to retry.",
      };
    }
  });
  const [selected, setSelected] = useState("");
  const [target, setTarget] = useState("");
  const tool = initial.tools.find((item) => item.id === selected);
  const amount = numberValue(target);
  const result =
    tool && amount !== null ? requiredTools(amount, tool.capacity24) : null;
  return (
    <Frame title="Required Tools">
      {initial.error && (
        <div className="banner error-banner" role="alert">
          {initial.error}
        </div>
      )}
      <section className="data-panel">
        <Link className="text-button" to="/data/capacity">
          Add or edit tool capacities <ArrowRight size={16} />
        </Link>
        <label className="data-field">
          <span>Select tool</span>
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Select a tool</option>
            {initial.tools.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {!initial.tools.length && !initial.error && (
          <p className="muted">
            Add a tool in the Capacity Calculator’s Manage Tools section to get
            started.
          </p>
        )}
        <Kpi
          label="24-hour capacity per tool"
          value={format(tool?.capacity24 ?? null)}
        />
        <Numeric label="24-hour target" value={target} onChange={setTarget} />
        <p className="muted">
          A full 24-hour run at the selected tool’s saved capacity.
        </p>
      </section>
      <section className="data-panel" aria-live="polite">
        <div className="data-result">
          <p className="eyebrow">TOOLS REQUIRED</p>
          <strong>{format(result?.count ?? null, 0)}</strong>
        </div>
        <p>
          {result
            ? result.count === 0
              ? "No tools are required for a zero target."
              : `Run ${format(result.count, 0)} ${result.count === 1 ? "tool" : "tools"} for 24 hours to meet your target.`
            : "Select a tool and enter your target."}
        </p>
        <div className="data-kpis">
          <Kpi label="Target" value={format(amount)} />
          <Kpi
            label="Total 24hr capacity"
            value={format(result?.total ?? null)}
          />
          <Kpi
            label="Capacity above target"
            value={format(result?.spare ?? null)}
          />
        </div>
        <p className="muted">
          Rounded up to whole tools. This is theoretical capacity; downtime and
          rejects are not included.
        </p>
      </section>
    </Frame>
  );
}
export function CapacityCalculator() {
  const [storage] = useState(() => new LocalToolStorage());
  const [initial] = useState(() => {
    try {
      return { tools: storage.load(), error: "" };
    } catch {
      return {
        tools: [] as CapacityTool[],
        error:
          "Stored tools could not be loaded. Data has been preserved; reload to retry.",
      };
    }
  });
  const [tools, setTools] = useState(initial.tools),
    [error, setError] = useState(initial.error);
  const [selected, setSelected] = useState(""),
    [count, setCount] = useState("1"),
    [mode, setMode] = useState("work"),
    [time, setTime] = useState(localTime);
  const [manage, setManage] = useState(false),
    [editing, setEditing] = useState<CapacityTool | "new" | null>(null),
    [name, setName] = useState(""),
    [amount, setAmount] = useState(""),
    [formError, setFormError] = useState(""),
    [deleting, setDeleting] = useState<CapacityTool | null>(null);
  const tool = tools.find((t) => t.id === selected),
    period = periodAt(time, mode === "work" ? 7 : 0),
    n = numberValue(count, true),
    result =
      tool && period && n !== null
        ? capacity(tool.capacity24, n, period.remaining)
        : null;
  const save = (next: CapacityTool[]) => {
    if (initial.error) return false;
    try {
      storage.save(next);
      setTools(next);
      setError("");
      return true;
    } catch {
      setError("Tools could not be saved. Free device space and retry.");
      return false;
    }
  };
  const openEdit = (item: CapacityTool | "new") => {
    setEditing(item);
    setName(item === "new" ? "" : item.name);
    setAmount(item === "new" ? "" : String(item.capacity24));
    setFormError("");
  };
  return (
    <Frame title={manage ? "Manage Tools" : "Capacity Calculator"}>
      {error && (
        <div className="banner error-banner" role="alert">
          {error}
        </div>
      )}
      {manage ? (
        <section className="data-panel">
          <button className="text-button" onClick={() => setManage(false)}>
            Back to calculator
          </button>
          <p className="muted">
            Saved on this device. Capacities are per tool over 24 hours.
          </p>
          {!tools.length && <p>No tools yet. Add your first tool below.</p>}
          {tools.map((item) => (
            <div className="data-tool-row" key={item.id}>
              <div>
                <h2>{item.name}</h2>
                <p className="muted">
                  24hr capacity: {format(item.capacity24)}
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() => openEdit(item)}
                disabled={!!initial.error}
                aria-label={`Edit ${item.name}`}
              >
                Edit
              </button>
            </div>
          ))}
          <button
            className="button primary"
            disabled={!!initial.error}
            onClick={() => openEdit("new")}
          >
            + Add Tool
          </button>
        </section>
      ) : (
        <>
          <section className="data-panel">
            <button className="text-button" onClick={() => setManage(true)}>
              Manage Tools
            </button>
            <label className="data-field">
              <span>Select tool</span>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Select a tool</option>
                {tools.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {!tools.length && (
              <p className="muted">
                Add a tool in Manage Tools to get started.
              </p>
            )}
            <Kpi
              label="24-hour capacity per tool"
              value={format(tool?.capacity24 ?? null)}
            />
            <Numeric
              label="Number of tools"
              value={count}
              onChange={setCount}
              positive
              integer
            />
            <Options
              label="Capacity time mode"
              choices={[
                ["work", "Work Day"],
                ["standard", "Standard 24hr Day"],
              ]}
              value={mode}
              onChange={setMode}
            />
            <p className="muted">
              {mode === "work" ? "07:00 → 07:00" : "00:00 → 00:00"}
            </p>
            <AsOf value={time} onChange={setTime} />
          </section>
          <section className="data-panel" aria-live="polite">
            <div className="data-result">
              <p className="eyebrow">TOTAL 24HR CAPACITY</p>
              <strong>{format(result?.total ?? null)}</strong>
            </div>
            <div className="data-result">
              <p className="eyebrow">THEORETICAL CAPACITY REMAINING</p>
              <strong>{format(result?.available ?? null)}</strong>
            </div>
            <label className="capacity-progress">
              Time remaining in period
              <progress max="24" value={period?.remaining ?? 0} />
            </label>
            <p className="muted">
              Time-based availability, assuming constant capacity. Actual output
              is not measured.
            </p>
            <div className="data-kpis">
              <Kpi label="Selected tool" value={tool?.name ?? "—"} />
              <Kpi
                label="Capacity per tool / 24hr"
                value={format(tool?.capacity24 ?? null)}
              />
              <Kpi label="Number of tools" value={format(n)} />
              <Kpi
                label="Hours elapsed"
                value={format(period?.elapsed ?? null)}
              />
              <Kpi
                label="Hours remaining"
                value={format(period?.remaining ?? null)}
              />
            </div>
          </section>
        </>
      )}
      {editing && (
        <Modal
          title={editing === "new" ? "Add Tool" : "Edit Tool"}
          onClose={() => setEditing(null)}
        >
          <form
            className="data-tool-form"
            onSubmit={(e) => {
              e.preventDefault();
              const cap = numberValue(amount, true),
                id = editing === "new" ? undefined : editing.id;
              const problem = validateTool(name, cap ?? 0, tools, id);
              if (problem) {
                setFormError(problem);
                return;
              }
              const record = {
                id: id ?? crypto.randomUUID(),
                name: name.trim(),
                capacity24: cap!,
              };
              if (
                save(
                  id
                    ? tools.map((t) => (t.id === id ? record : t))
                    : [...tools, record],
                )
              ) {
                if (!selected) setSelected(record.id);
                setEditing(null);
              } else {
                setFormError(
                  "Could not save this tool. Free device space and retry.",
                );
              }
            }}
          >
            <label className="data-field">
              <span>Tool name</span>
              <input
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </label>
            <Numeric
              label="24-hour capacity"
              value={amount}
              onChange={setAmount}
              positive
            />
            {formError && <p role="alert">{formError}</p>}
            <button className="button primary" type="submit">
              Save
            </button>
            {editing !== "new" && (
              <button
                className="text-button danger"
                type="button"
                onClick={() => {
                  setDeleting(editing);
                  setEditing(null);
                }}
              >
                Delete tool
              </button>
            )}
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete tool?" onClose={() => setDeleting(null)}>
          <p>Delete {deleting.name} and its saved capacity?</p>
          <div className="data-options">
            <button onClick={() => setDeleting(null)}>Cancel</button>
            <button
              onClick={() => {
                if (save(tools.filter((t) => t.id !== deleting.id))) {
                  if (selected === deleting.id) setSelected("");
                  setDeleting(null);
                }
              }}
            >
              Delete tool
            </button>
          </div>
        </Modal>
      )}
    </Frame>
  );
}
