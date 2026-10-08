import { useEffect, useRef, useState, type PointerEvent } from "react";
import { copyText } from "../../services/clipboard";
import { DetectedHandwriting } from "./DetectedHandwriting";
import { cropHandwritingLine, selectionBetween, startHandwriting, type LineSelection } from "./handwriting";

export function HandwritingReader({ image }: { image: string }) {
  const [open, setOpen] = useState(false);
  const [enhanceContrast, setEnhanceContrast] = useState(true);
  const [selection, setSelection] = useState<LineSelection>({ x: .1, y: .1, width: .8, height: .1 });
  const [selected, setSelected] = useState(false);
  const [draft, setDraft] = useState<LineSelection | null>(null);
  const [preview, setPreview] = useState("");
  const [text, setText] = useState("");
  const [hasResult, setHasResult] = useState(false);
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const job = useRef<ReturnType<typeof startHandwriting> | null>(null);
  const mounted = useRef(true);
  const version = useRef(0);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const firstTap = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; version.current++; job.current?.cancel(); }; }, []);
  useEffect(() => {
    if (!selected) return;
    let live = true; setPreview("");
    void cropHandwritingLine(image, selection, enhanceContrast).then(value => { if (live) setPreview(value); }).catch(error => { if (live) setMessage(error.message); });
    return () => { live = false; };
  }, [image, selection, selected, enhanceContrast]);
  function point(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
  }
  function pick(value: LineSelection) { setSelection(value); setSelected(true); setText(""); setHasResult(false); setMessage(""); }
  function down(event: PointerEvent<HTMLDivElement>) {
    if (running) return;
    drag.current = point(event); setDraft(selectionBetween(drag.current, drag.current)); event.currentTarget.setPointerCapture(event.pointerId);
  }
  function up(event: PointerEvent<HTMLDivElement>) {
    if (running || !drag.current) return;
    const end = point(event), start = drag.current; drag.current = null;
    setDraft(null);
    if (Math.hypot(end.x - start.x, end.y - start.y) > .015) { firstTap.current = null; pick(selectionBetween(start, end)); }
    else if (firstTap.current) { pick(selectionBetween(firstTap.current, end)); firstTap.current = null; }
    else { firstTap.current = end; setMessage("Now tap the opposite corner of the handwritten line."); }
  }
  async function read() {
    if (!preview || job.current || running) return;
    setRunning(true); setText(""); const id = ++version.current;
    try {
      const active = startHandwriting(preview, setMessage); job.current = active;
      const result = await active.promise;
      if (mounted.current && version.current === id) { setText(result); setHasResult(true); setMessage(result ? "Suggested reading — check every word against the photo." : "No reading returned. Adjust the selection and try again."); }
    } catch (error) {
      if (mounted.current && version.current === id) setMessage(error instanceof DOMException && error.name === "AbortError" ? "Stopped. You can try again." : "Could not load or run the handwriting reader. Check your internet connection, keep the app open, and try again. Your phone may not have enough available memory.");
    } finally { if (mounted.current && version.current === id) { job.current = null; setRunning(false); } }
  }
  async function copy() { try { await copyText(text); if (mounted.current) setMessage("Handwriting text copied."); } catch { if (mounted.current) setMessage("Select the text and copy it manually."); } }
  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "handwritten-notes.txt";
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <><DetectedHandwriting image={image} /><section className="board-controls" aria-labelledby="handwriting-heading">
    <h2 id="handwriting-heading">Handwriting reader <span className="muted">· experimental</span></h2>
    <p>Read one handwritten line at a time. This uses a dedicated handwriting model and can return incorrect words, particularly for dates, numbers and signatures.</p>
    <p className="muted">Free and on-device. First use downloads about 70 MB of model files, plus the reader runtime, from Hugging Face and jsDelivr. Wi-Fi is recommended. Downloads may be cached; your photo stays on this device.</p>
    {!open ? <button className="button secondary" onClick={() => setOpen(true)}>Select a handwritten line</button> : <>
      <p>Drag a box around one line, or tap its top-left and bottom-right corners. Exclude printed labels and table borders.</p>
      <label className="board-toggle"><input type="checkbox" checked={enhanceContrast} disabled={running} onChange={event => { setEnhanceContrast(event.target.checked); setText(""); setHasResult(false); setMessage(""); }} /> Improve faint handwriting contrast</label>
      <div className="handwriting-select" onPointerDown={down} onPointerUp={up} onPointerCancel={() => { drag.current = null; firstTap.current = null; setDraft(null); }} onPointerMove={event => { if (drag.current && !running) setDraft(selectionBetween(drag.current, point(event))); }}>
        <img src={image} alt="Original photo for handwriting selection" draggable={false} />
        {(selected || draft) && <span className="handwriting-box" style={{ left: `${(draft || selection).x * 100}%`, top: `${(draft || selection).y * 100}%`, width: `${(draft || selection).width * 100}%`, height: `${(draft || selection).height * 100}%` }} />}
      </div>
      <details><summary>Set selection with numbers</summary><div className="handwriting-numbers">
        {(["x", "y", "width", "height"] as const).map(key => <label key={key}>{({ x: "Left", y: "Top", width: "Width", height: "Height" })[key]} (%)<input type="number" min="0" max="100" step=".1" disabled={running} value={Math.round(selection[key] * 1000) / 10} onChange={event => {
          const value = Math.max(0, Math.min(1, Number(event.target.value) / 100));
          const next = { ...selection, [key]: value }; next.width = Math.min(next.width, 1 - next.x); next.height = Math.min(next.height, 1 - next.y); pick(next);
        }} /></label>)}
      </div></details>
      {preview && <figure className="handwriting-preview"><figcaption>Selected line — check this includes all the handwriting</figcaption><img src={preview} alt="Selected handwriting line" /></figure>}
      <div className="inline-buttons"><button className="button primary" disabled={!preview || running} onClick={() => void read()}>Read handwriting</button>{running && <button className="button secondary" onClick={() => job.current?.cancel()}>Cancel</button>}</div>
    </>}
    <p role="status" aria-live="polite">{message}</p>
    {hasResult && <><label htmlFor="handwriting-result">Suggested handwriting (editable)</label><textarea className="board-text" id="handwriting-result" rows={3} value={text} onChange={event => setText(event.target.value)} /><div className="inline-buttons"><button className="button secondary" disabled={!text.trim()} onClick={() => void copy()}>Copy handwriting</button><button className="button secondary" disabled={!text.trim()} onClick={download}>Download handwriting</button></div></>}
  </section></>;
}
