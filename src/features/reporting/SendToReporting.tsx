import { useState } from "react";
import { Link } from "react-router-dom";
import { sendReport, type ReportInput } from "./reportStorage";

export function SendToReporting({ input }: { input: ReportInput | null }) {
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  return <section className="data-panel">
    <button className="button primary" disabled={!input} onClick={() => {
      try { sendReport(input!); setFailed(false); setMessage("Snapshot sent. Sending this tool group again replaces its previous report."); }
      catch { setFailed(true); setMessage("Could not save this report. Check device storage; existing reports have been preserved."); }
    }}>Send to Reporting</button>
    <p className="muted">{input ? "Save these figures for your executive dashboard. Later edits appear only when you send again." : "Complete the figures above to send a report."}</p>
    {message && <p role={failed ? "alert" : "status"}>{message}</p>}
    <Link className="text-button" to="/reporting">Open Reporting →</Link>
  </section>;
}
