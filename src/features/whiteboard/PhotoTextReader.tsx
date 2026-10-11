import { useState } from "react";
import { OnlineHandwriting } from "./OnlineHandwriting";
import { TextExtraction } from "./TextExtraction";

export function PhotoTextReader({ image, original }: { image: string; original: string }) {
  const [mode, setMode] = useState<"online" | "offline">("online");
  return <>
    <section className="board-controls" aria-labelledby="photo-reading-heading">
      <h2 id="photo-reading-heading">Read your photo</h2>
      <div className="inline-buttons" role="group" aria-label="Photo reader">
        <button className={`button ${mode === "online" ? "primary" : "secondary"}`} aria-pressed={mode === "online"} onClick={() => setMode("online")}>Online · handwriting + print</button>
        <button className={`button ${mode === "offline" ? "primary" : "secondary"}`} aria-pressed={mode === "offline"} onClick={() => setMode("offline")}>Offline · printed text</button>
      </div>
      <p className="muted">Online reading is recommended for handwriting. Offline reading handles printed text on your device. Copy your notes before switching readers.</p>
    </section>
    {mode === "online" ? <OnlineHandwriting image={original} /> : <TextExtraction key={image} image={image} original={original} />}
  </>;
}
