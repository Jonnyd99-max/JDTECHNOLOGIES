import { useEffect, useRef, useState } from "react";
import { copyText } from "../../services/clipboard";
import { startMixedExtraction } from "./mixedExtraction";
import { handwritingMarker, mixedNotes, type MixedRegion } from "./mixedRegions";

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
      setMessage(result.length ? `Printed text extracted. ${handwriting} possible handwriting regions need review; ${uncertain} uncertain regions were withheld from the notes. Check the photo for missing text.` : "No text regions found. Try a closer, straight-on photo or the manual readers below.");
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
  function includeReading(index: number) {
    const region = regions[index], marker = handwritingMarker(index);
    if (!region.text.trim()) return;
    if (!text.includes(marker)) { setMessage("The region’s marker was removed from your notes. Copy its reviewed reading into the correct place manually."); return; }
    setText(text.replace(marker, region.text.trim()));
    setRegions(regions.map((current, i) => i === index ? { ...current, accepted: true } : current));
    setMessage(`Reviewed reading for region ${index + 1} included.`);
  }
  function cropPreview(region: MixedRegion, index: number) {
    const b = region.bbox;
    return <svg role="img" aria-label={`Photo crop for region ${index + 1}`} viewBox={`${Math.max(0, b.x0 - 6)} ${Math.max(0, b.y0 - 6)} ${b.x1 - b.x0 + 12} ${b.y1 - b.y0 + 12}`} style={{ width: "100%", maxWidth: 600, maxHeight: 100 }}><image href={image} width={size.width} height={size.height} /></svg>;
  }
  return <section className="board-controls" aria-labelledby="mixed-heading">
    <h2 id="mixed-heading">Automatic printed + handwriting reader</h2>
    <p>Reads the prepared document and automatically finds possible handwriting. Review the suggested readings before adding them to your notes.</p>
    <p className="muted">Experimental and free. Your photo stays on this device. Border-like and uncertain regions are withheld. The reader can still miss writing or misread names and dates; automatic handwriting recognition is not reliable enough to accept unchecked.</p>
    <div className="inline-buttons"><button className="button primary" disabled={running} onClick={() => void extract()}>{complete ? "Read mixed text again" : "Read mixed text automatically"}</button>{running && <button className="button secondary" onClick={() => job.current?.cancel()}>Cancel automatic reading</button>}</div>
    <p role="status" aria-live="polite">{message}</p>
    {complete && <>
      <p className="muted">Handwriting placeholders contain no guessed words. Check each candidate below, correct its reading, then include it. Withheld regions remain available for review.</p>
      <label htmlFor="mixed-notes">Editable mixed-text notes</label><textarea id="mixed-notes" className="board-text" rows={12} value={text} onChange={event => setText(event.target.value)} />
      <div className="inline-buttons"><button className="button secondary" disabled={!text.trim()} onClick={() => void copy()}>Copy mixed text</button><button className="button secondary" disabled={!text.trim()} onClick={download}>Download mixed notes</button></div>
      {regions.map((region, index) => region.kind === "handwritten" && !region.omitted && <div key={index} className="board-region">
        <h3>Review handwriting region {index + 1}</h3>
        {cropPreview(region, index)}
        {!region.text && <p>The readings disagree or could not be read. Check the crop and enter the correct text.</p>}
        <label htmlFor={`handwriting-candidate-${index}`}>Suggested reading · region {index + 1}</label>
        <textarea id={`handwriting-candidate-${index}`} className="board-text" rows={2} value={region.text} disabled={region.accepted} onChange={event => setRegions(regions.map((current, i) => i === index ? { ...current, text: event.target.value } : current))} />
        <button className="button secondary" disabled={!region.text.trim() || region.accepted} onClick={() => includeReading(index)}>{region.accepted ? "Reading included" : "Include reviewed reading"}</button>
        <details><summary>Compare reader attempts</summary>{region.alternatives?.map((reading, i) => <p key={i} className="board-reading">{reading || "No reading"}</p>)}<p className="muted">OCR alternative: {region.printedText}</p></details>
      </div>)}
      <details><summary>Review detected regions ({regions.length})</summary><p className="muted">These labels are estimates. Check the handwriting suggestions against their crops. Use the manual handwriting reader below if a crop misses letters.</p>
        {regions.map((region, index) => <div key={index} className="board-region">
          <h3>Region {index + 1} · {region.omitted ? "Withheld" : region.kind === "uncertain" ? "Uncertain type · withheld" : `Likely ${region.kind}`}</h3>
          {cropPreview(region, index)}
          {region.omitted && <p>{region.omitted}</p>}
          <p className="board-reading">{region.text || "No handwriting reading returned."}</p>
          {region.kind === "handwritten" && <p className="muted">Printed reader alternative: {region.printedText}</p>}
        </div>)}
      </details>
    </>}
  </section>;
}
