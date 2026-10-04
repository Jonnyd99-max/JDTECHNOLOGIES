import { useEffect, useRef, useState } from "react";
import { Copy, Download, ScanText } from "lucide-react";
import { copyText } from "../../services/clipboard";
import { startExtraction, type TextLayout, type ExtractionCandidate } from "./extraction";

export function TextExtraction({ image, original }: { image: string; original: string }) {
  const [layout, setLayout] = useState<TextLayout>("form");
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [compare, setCompare] = useState(true);
  const [candidates, setCandidates] = useState<ExtractionCandidate[]>([]);
  const job = useRef<ReturnType<typeof startExtraction> | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; job.current?.cancel(); }; }, []);
  async function extract() {
    if (job.current) return;
    setRunning(true); setComplete(false); setMessage("");
    const active = startExtraction(image, layout, setMessage, original, compare); job.current = active;
    try {
      const output = await active.promise;
      if (!mounted.current || job.current !== active) return;
      setCandidates(output); setText(output[0]?.text || ""); setComplete(true);
      setMessage(output[0]?.text ? `Text extracted from ${output[0].source.toLowerCase()}. Review and correct it below.${output[0].confidence < 65 ? " The reader is unsure about much of this text." : ""}` : "No readable text found. Crop to a single line and try the Single line layout.");
    } catch (error) {
      if (!mounted.current || job.current !== active) return;
      setMessage(error instanceof DOMException && error.name === "AbortError"
        ? "Text extraction stopped. You can try again."
        : "Could not read the photo. Connect to the internet to load the text reader, then retry. Try a smaller photo if it keeps failing.");
    } finally {
      if (mounted.current && job.current === active) { job.current = null; setRunning(false); }
    }
  }
  async function copy() {
    try { await copyText(text); if (mounted.current) setMessage("Text copied."); }
    catch { if (mounted.current) setMessage("Could not copy. Select the text below and copy it manually."); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "white-board-notes.txt";
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="board-controls" aria-labelledby="extract-heading">
    <h2 id="extract-heading">Extract text</h2>
    <p>For school forms and tables, use Printed form / table. It reads a grayscale version of the original photo with more detail. For a handwritten field, crop to that field and try Single line; joined-up writing may still need manual correction.</p>
    <p className="muted">Free processing on your device. Internet is needed to load the OCR engine and English language data. Your photo is not uploaded. Changing the image adjustments clears this text, so copy or download it first.</p>
    <div className="inline-buttons">
      <label className="board-layout">Text layout <select value={layout} disabled={running} onChange={e => setLayout(e.target.value as TextLayout)}><option value="form">Printed form / table</option><option value="notes">Whiteboard / scattered notes</option><option value="document">Paper / document</option><option value="block">Handwritten block</option><option value="line">Single line</option></select></label>
      <label><input type="checkbox" checked={compare} disabled={running} onChange={e => setCompare(e.target.checked)} /> Compare original and cleaned photo (slower)</label>
      <button className="button primary" disabled={running} onClick={() => void extract()}><ScanText size={18} />{complete ? "Extract again" : "Extract text"}</button>
      {running && <button className="button secondary" onClick={() => job.current?.cancel()}>Cancel</button>}
    </div>
    <p role="status" aria-live="polite">{message}</p>
    {complete && candidates.length > 1 && <details><summary>Compare both readings</summary><p className="muted">Forms show the prepared document reading first. Other layouts use the reader’s confidence, which does not guarantee accuracy. Copy useful words from either reading into your editable notes.</p>{candidates.map(candidate => <div key={candidate.source}><h3>{candidate.source}</h3><pre className="board-reading">{candidate.text || "No text detected."}</pre></div>)}</details>}
    {(complete || text) && <><label htmlFor="extracted-notes">Editable notes</label><textarea id="extracted-notes" className="board-text" value={text} disabled={running} onChange={e => setText(e.target.value)} rows={12} />
      <div className="inline-buttons"><button className="button secondary" disabled={!text.trim() || running} onClick={() => void copy()}><Copy size={18} /> Copy text</button><button className="button secondary" disabled={!text.trim() || running} onClick={download}><Download size={18} /> Download notes</button></div></>}
  </section>;
}
