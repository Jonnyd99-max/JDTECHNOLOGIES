import { useEffect, useRef, useState } from "react";
import { copyText } from "../../services/clipboard";
import { startMixedExtraction } from "./mixedExtraction";
import { mixedNotes, type MixedRegion } from "./mixedRegions";

export function MixedTextExtraction({ image }: { image: string }) {
  const [regions, setRegions] = useState<MixedRegion[]>([]);
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");
  const [size, setSize] = useState({ width: 1, height: 1 });
  const job = useRef<ReturnType<typeof startMixedExtraction> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const photo = new Image(); photo.onload = () => { if (mounted.current) setSize({ width: photo.width, height: photo.height }); }; photo.src = image;
    return () => { mounted.current = false; job.current?.cancel(); };
  }, [image]);
  async function extract() {
    if (job.current) return;
    setRunning(true); setComplete(false); setMessage("");
    const active = startMixedExtraction(image, setMessage); job.current = active;
    try {
      const result = await active.promise;
      if (!mounted.current || job.current !== active) return;
      setRegions(result); setText(mixedNotes(result)); setComplete(true);
      const handwriting = result.filter(region => region.kind === "handwritten").length;
      const uncertain = result.filter(region => region.kind === "uncertain").length;
      setMessage(result.length ? `Read ${result.length} regions: ${handwriting} likely handwritten, ${uncertain} uncertain. Check names, dates and reading order against the photo.` : "No text regions found. Try a closer, straight-on photo or the manual readers below.");
    } catch (error) {
      if (mounted.current && job.current === active) setMessage(error instanceof DOMException && error.name === "AbortError" ? "Automatic reading stopped. You can retry." : error instanceof Error ? error.message : "Could not read this photo. Try a smaller crop.");
    } finally { if (mounted.current && job.current === active) { job.current = null; setRunning(false); } }
  }
  async function copy() {
    try { await copyText(text); if (mounted.current) setMessage("Text copied."); }
    catch { if (mounted.current) setMessage("Select the notes below and copy manually."); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "mixed-text-notes.txt"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="board-controls" aria-labelledby="mixed-heading">
    <h2 id="mixed-heading">Automatic printed + handwriting reader</h2>
    <p>Finds text regions, estimates their type, and reads handwriting separately from print. You do not need to select each field.</p>
    <p className="muted">Experimental and free. First use downloads the detector and handwriting reader; processing stays on your device. It can miss writing, mistake ticks or signatures for words, or guess names and dates incorrectly. Uncertain regions keep the printed reader’s result for review.</p>
    <div className="inline-buttons"><button className="button primary" disabled={running} onClick={() => void extract()}>{complete ? "Read mixed text again" : "Read mixed text automatically"}</button>{running && <button className="button secondary" onClick={() => job.current?.cancel()}>Cancel automatic reading</button>}</div>
    <p role="status" aria-live="polite">{message}</p>
    {complete && <>
      <p className="muted">Handwriting readings are marked as suggestions in your notes. Correct them and remove the markers after checking the photo.</p>
      <label htmlFor="mixed-notes">Editable mixed-text notes</label><textarea id="mixed-notes" className="board-text" rows={12} value={text} onChange={event => setText(event.target.value)} />
      <div className="inline-buttons"><button className="button secondary" disabled={!text.trim()} onClick={() => void copy()}>Copy mixed text</button><button className="button secondary" disabled={!text.trim()} onClick={download}>Download mixed notes</button></div>
      <details><summary>Review detected regions ({regions.length})</summary><p className="muted">These labels are estimates. Check the handwriting suggestions against their crops. Use the manual handwriting reader below if a crop misses letters.</p>
        {regions.map((region, index) => { const b = region.bbox; return <div key={index} className="board-region">
          <h3>Region {index + 1} · {region.kind === "uncertain" ? "Uncertain type · OCR retained" : `Likely ${region.kind}`}</h3>
          <svg role="img" aria-label={`Photo crop for region ${index + 1}`} viewBox={`${Math.max(0, b.x0 - 6)} ${Math.max(0, b.y0 - 6)} ${b.x1 - b.x0 + 12} ${b.y1 - b.y0 + 12}`} style={{ width: "100%", maxWidth: 600, maxHeight: 100 }}><image href={image} width={size.width} height={size.height} /></svg>
          <p className="board-reading">{region.text || "No handwriting reading returned."}</p>
          {region.kind === "handwritten" && <p className="muted">Printed reader alternative: {region.printedText}</p>}
        </div>; })}
      </details>
    </>}
  </section>;
}
