import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Upload, RotateCw, Download } from "lucide-react";
import { cleanPixels } from "./cleanup";
import { TextExtraction } from "./TextExtraction";
import { HandwritingReader } from "./HandwritingReader";
import { MixedTextExtraction } from "./MixedTextExtraction";

export function WhiteboardScreen() {
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [original, setOriginal] = useState("");
  const [result, setResult] = useState("");
  const [ocrOriginal, setOcrOriginal] = useState("");
  const [strength, setStrength] = useState(.65);
  const [colour, setColour] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  async function load(file?: File) {
    if (!file) return;
    const id = ++request.current;
    setError("");
    if (!file.type.startsWith("image/") || file.size > 25 * 1024 * 1024) {
      setError("Choose an image smaller than 25 MB."); return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      if (id !== request.current) return;
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 3000 / Math.max(img.width, img.height), Math.sqrt(6000000 / (img.width * img.height)));
      canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      const resized = new Image(); resized.src = canvas.toDataURL("image/png"); await resized.decode();
      if (id !== request.current) return;
      setOriginal(resized.src); setSource(resized); setRotation(0); setCrop({ top: 0, bottom: 0, left: 0, right: 0 });
    } catch { if (id === request.current) setError("Could not open this photo. Try a JPG, PNG or WebP image."); }
    finally { URL.revokeObjectURL(url); if (id === request.current) setBusy(false); }
  }
  useEffect(() => {
    if (!source) return;
    setResult("");
    const timer = window.setTimeout(() => {
      try {
        const canvas = document.createElement("canvas");
        const w = Math.max(1, Math.round(source.width * (1 - (crop.left + crop.right) / 100)));
        const h = Math.max(1, Math.round(source.height * (1 - (crop.top + crop.bottom) / 100)));
        canvas.width = rotation % 2 ? h : w; canvas.height = rotation % 2 ? w : h;
        const ctx = canvas.getContext("2d"); if (!ctx) throw new Error();
        ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(rotation * Math.PI / 2);
        ctx.drawImage(source, source.width * crop.left / 100, source.height * crop.top / 100, w, h, -w / 2, -h / 2, w, h);
        setOcrOriginal(canvas.toDataURL("image/png"));
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        cleanPixels(pixels.data, canvas.width, canvas.height, strength, colour);
        ctx.putImageData(pixels, 0, 0); setResult(canvas.toDataURL("image/png"));
      } catch { setError("Could not process this image. Try a smaller photo."); setResult(""); }
    }, 100);
    return () => window.clearTimeout(timer);
  }, [source, strength, colour, rotation, crop]);
  return <div className="whiteboard-page">
    <Link className="text-button" to="/">← Workspace</Link>
    <div className="page-heading"><div><p className="eyebrow">PHOTO TO CLEARER NOTES</p><h1>White Board Clean Up</h1><p className="muted">Brighten the background and make your writing easier to read.</p></div></div>
    <div className="board-controls">
      <p>Free, on-device processing. Your photos stay on this device. Download your result before leaving this screen.</p>
      <div className="inline-buttons">
        <button className="button primary" disabled={busy} onClick={() => camera.current?.click()}><Camera size={18} /> Take a photo</button>
        <button className="button secondary" disabled={busy} onClick={() => upload.current?.click()}><Upload size={18} /> Upload photo</button>
      </div>
      <input ref={upload} hidden type="file" accept="image/*" onChange={e => { void load(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={camera} hidden type="file" accept="image/*" capture="environment" onChange={e => { void load(e.target.files?.[0]); e.target.value = ""; }} />
      {busy && <p role="status">Opening photo…</p>}
      {error && <p role="alert" className="banner error-banner">{error}</p>}
      {source && <div className="board-settings">
        <label>Cleanup strength: {Math.round(strength * 100)}%<input type="range" min="0" max="1" step=".05" value={strength} onChange={e => setStrength(Number(e.target.value))} /></label>
        <details className="board-crop"><summary>Crop to the writing</summary><p className="muted">For difficult handwriting, isolate a few words or one line. Edges refer to the original photo.</p>
          {(["top", "bottom", "left", "right"] as const).map(edge => {
            const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" } as const;
            return <label key={edge}>Crop {edge}: {crop[edge]}%<input type="range" min="0" max={90 - crop[opposite[edge]]} value={crop[edge]} onChange={e => setCrop({ ...crop, [edge]: Number(e.target.value) })} /></label>;
          })}
        </details>
        <label><input type="checkbox" checked={colour} onChange={e => setColour(e.target.checked)} /> Keep marker colours</label>
        <button className="button secondary" onClick={() => setRotation((rotation + 1) % 4)}><RotateCw size={18} /> Rotate</button>
        <button className="text-button" onClick={() => { setStrength(.65); setCrop({ top: 0, bottom: 0, left: 0, right: 0 }); setRotation(0); setColour(true); }}>Reset adjustments</button>
      </div>}
    </div>
    {source ? <><div className="board-comparison"><figure><figcaption>Original</figcaption><img src={original} alt="Original uploaded whiteboard or paper" /></figure><figure><figcaption>Cleaned image</figcaption>{result && <img src={result} alt="Cleaned whiteboard or paper" />}</figure></div>
      {result && <a className="button primary" href={result} download="white-board-cleaned.png"><Download size={18} /> Download cleaned image</a>}
      <p className="muted">Check faint writing before saving. Reduce strength if details fade. Photos retain up to 3,000 pixels on the longest side, within a 6-megapixel limit.</p></> : <div className="board-empty"><Camera size={40} /><h2>Give your notes a clearer background.</h2><p>Photograph the board or paper straight on, with even lighting. Include all the writing you want to keep.</p></div>}
    {result && !busy && <MixedTextExtraction key={`mixed-${ocrOriginal}`} image={ocrOriginal} />}
    {result && !busy && <TextExtraction key={result} image={result} original={ocrOriginal} />}
    {result && !busy && <HandwritingReader key={`handwriting-${ocrOriginal}`} image={ocrOriginal} />}
    <p className="muted">Review extracted text against your photo. Diagram redrawing is not included.</p>
  </div>;
}
