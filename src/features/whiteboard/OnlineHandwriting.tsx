import { useEffect, useRef, useState } from "react";
import { copyText } from "../../services/clipboard";
import { prepareOnlinePhoto, readOnlinePhoto } from "./onlineOcr";

export function OnlineHandwriting({ image }: { image: string }) {
  const [key, setKey] = useState("");
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [text, setText] = useState("");
  const [hasResult, setHasResult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const version = useRef(0);

  useEffect(() => {
    const id = ++version.current;
    controller.current?.abort(); controller.current = null;
    setBusy(false); setPhoto(null); setPreview(""); setText(""); setHasResult(false); setConsent(false);
    setMessage("Preparing an upload preview on your device…");
    let url = "";
    void prepareOnlinePhoto(image).then(blob => {
      if (id !== version.current) return;
      url = URL.createObjectURL(blob); setPhoto(blob); setPreview(url); setMessage("");
    }).catch(() => { if (id === version.current) setMessage("Could not prepare this photo. Try a smaller crop."); });
    return () => { version.current++; controller.current?.abort(); if (url) URL.revokeObjectURL(url); };
  }, [image]);

  async function read() {
    if (!photo || !key.trim() || !consent || controller.current) return;
    const active = new AbortController(); controller.current = active;
    const id = version.current;
    setBusy(true); setMessage("Sending this photo to OCR.space and reading handwriting…");
    let timedOut = false;
    const timer = window.setTimeout(() => { timedOut = true; active.abort(); }, 120_000);
    try {
      const reading = await readOnlinePhoto(photo, key, active.signal);
      if (id !== version.current || active.signal.aborted) return;
      setText(reading); setHasResult(true);
      setMessage(reading ? "Reading ready. Check names, numbers and technical codes against the photo." : "No text found. Try cropping closer to the writing.");
    } catch (error) {
      if (id !== version.current) return;
      setMessage(active.signal.aborted
        ? timedOut ? "The request timed out. OCR.space may still count it against your allowance. No automatic retry was sent." : "Stopped waiting. The photo may already have reached OCR.space and used one conversion."
        : error instanceof TypeError ? "Could not connect to OCR.space. Check your connection or try the offline reader. No automatic retry was sent."
        : error instanceof Error ? error.message : "Could not read this photo.");
    } finally {
      window.clearTimeout(timer);
      if (controller.current === active) controller.current = null;
      if (id === version.current) setBusy(false);
    }
  }

  return <section className="board-controls" aria-labelledby="online-handwriting-heading">
    <h2 id="online-handwriting-heading">Online handwriting reader <span className="muted">· free API trial</span></h2>
    <p>Try OCR.space Engine 3 for handwritten and printed notes together. Use the crop controls above to exclude empty board space and diagrams.</p>
    <p className="muted">Use a free key only. Engine 3 allows 1,000 conversions per month, shared with any other use of your key. This reader uses the free endpoint and never switches to a paid service or retries automatically.</p>
    <details><summary>Connect your free OCR.space key</summary>
      <p><a href="https://ocr.space/ocrapi/freekey" target="_blank" rel="noopener noreferrer">Get a free API key</a>, then enter it here. Your key stays in memory while this reader is open; it is not saved or included in the app download. You will need to enter it again after leaving this screen.</p>
      <label htmlFor="online-ocr-key">Your free API key</label>
      <input className="board-text" id="online-ocr-key" type="password" autoComplete="off" spellCheck={false} value={key} disabled={busy} onChange={event => setKey(event.target.value)} />
      <button className="text-button" disabled={busy || !key} onClick={() => setKey("")}>Clear key</button>
    </details>
    {preview && <figure className="handwriting-preview"><figcaption>Photo to send · {Math.ceil((photo?.size || 0) / 1000)} KB · compressed below 1 MB</figcaption><img src={preview} alt="Compressed photo that will be sent to OCR.space" /></figure>}
    <label className="board-toggle"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} /> Send this photo to OCR.space for online reading</label>
    <p className="muted">Online reading uploads your photo to an external service. Check permission before sending workplace or personal information. <a href="https://ocr.space/privacypolicy" target="_blank" rel="noopener noreferrer">OCR.space privacy policy</a></p>
    <div className="inline-buttons"><button className="button primary" disabled={busy || !photo || !key.trim() || !consent} onClick={() => void read()}>Read online</button>{busy && <button className="button secondary" onClick={() => controller.current?.abort()}>Cancel</button>}</div>
    {!key.trim() && <p className="muted">Open “Connect your free OCR.space key” to enable online reading.</p>}
    <p role="status" aria-live="polite">{message}</p>
    {hasResult && <><label htmlFor="online-ocr-result">Online reading (editable)</label><textarea id="online-ocr-result" className="board-text" rows={8} value={text} onChange={event => setText(event.target.value)} /><button className="button secondary" disabled={!text.trim()} onClick={() => { const id = version.current; void copyText(text).then(() => { if (id === version.current) setMessage("Online reading copied."); }).catch(() => { if (id === version.current) setMessage("Select the text and copy it manually."); }); }}>Copy text</button></>}
  </section>;
}
