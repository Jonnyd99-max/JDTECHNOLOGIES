import { useEffect, useRef, useState } from "react";
import { copyText } from "../../services/clipboard";
import { prepareOnlinePhoto, readOnlinePhoto } from "./onlineOcr";
import { loadOcrKey, saveOcrKey } from "./ocrKeyStorage";

export function OnlineHandwriting({ image }: { image: string }) {
  const [stored] = useState(loadOcrKey);
  const [key, setKey] = useState(stored.key);
  const [savedKey, setSavedKey] = useState(stored.key);
  const [keyMessage, setKeyMessage] = useState(stored.message);
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
    <h2 id="online-handwriting-heading">Online reader · handwriting + print</h2>
    <p>Read handwritten and printed notes together with OCR.space. Crop above to exclude brands, labels and diagrams.</p>
    <p className="muted">Use a free key only. Engine 3 allows 1,000 conversions per month, shared with any other use of your key. This reader uses the free endpoint and never switches to a paid service or retries automatically.</p>
    <details open={!savedKey}><summary>{savedKey ? "Manage your saved OCR.space key" : "Set up your free OCR.space reader"}</summary>
      <p><a href="https://ocr.space/ocrapi/freekey" target="_blank" rel="noopener noreferrer">Sign up for your own free API key</a>, then enter it here and save it. Each user has their own key and allowance.</p>
      <p className="muted">Saved only in this browser or installed app on this device. It is not encrypted and is accessible to anyone using this browser profile. It is never included in the published app or shared with other users. Clearing app data removes it.</p>
      <label htmlFor="online-ocr-key">Your free API key</label>
      <input className="board-text" id="online-ocr-key" type="password" autoComplete="off" spellCheck={false} value={key} disabled={busy} onChange={event => setKey(event.target.value)} />
      <div className="inline-buttons"><button className="button secondary" disabled={busy || !key.trim()} onClick={() => {
        try { saveOcrKey(key); setSavedKey(key.trim()); setKey(key.trim()); setKeyMessage("Key saved on this device. It will be loaded next time."); }
        catch { setKeyMessage("Could not save the key. You can use it for this visit, but will need to enter it again next time."); }
      }}>Save key on this device</button>
      <button className="text-button" disabled={busy || (!key && !savedKey)} onClick={() => {
        try { saveOcrKey(""); setKey(""); setSavedKey(""); setKeyMessage("Saved key removed. Enter a new key to read online."); }
        catch { setKeyMessage("Could not remove the saved key. Clear this site's data in browser settings to remove it."); }
      }}>Remove saved key</button></div>
      <p role="status">{keyMessage}</p>
    </details>
    {savedKey && key.trim() === savedKey && <p className="muted">Your free API key is saved on this device.</p>}
    {preview && <figure className="handwriting-preview"><figcaption>Photo to send · {Math.ceil((photo?.size || 0) / 1000)} KB · compressed below 1 MB</figcaption><img src={preview} alt="Compressed photo that will be sent to OCR.space" /></figure>}
    <label className="board-toggle"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} /> Send this photo to OCR.space for online reading</label>
    <p className="muted">Online reading uploads your photo to an external service. Check permission before sending workplace or personal information. <a href="https://ocr.space/privacypolicy" target="_blank" rel="noopener noreferrer">OCR.space privacy policy</a></p>
    <div className="inline-buttons"><button className="button primary" disabled={busy || !photo || !key.trim() || !consent} onClick={() => void read()}>Read online</button>{busy && <button className="button secondary" onClick={() => controller.current?.abort()}>Cancel</button>}</div>
    {!key.trim() && <p className="muted">Sign up and enter your own free key above to enable online reading.</p>}
    <p role="status" aria-live="polite">{message}</p>
    {hasResult && <><label htmlFor="online-ocr-result">Online reading (editable)</label><textarea id="online-ocr-result" className="board-text" rows={8} value={text} onChange={event => setText(event.target.value)} /><button className="button secondary" disabled={!text.trim()} onClick={() => { const id = version.current; void copyText(text).then(() => { if (id === version.current) setMessage("Online reading copied."); }).catch(() => { if (id === version.current) setMessage("Select the text and copy it manually."); }); }}>Copy text</button></>}
  </section>;
}
