import { useId, useState } from "react";
import { formatNotes, type NoteLayout } from "./formatNotes";

export function NoteFormatting({ text, onChange, disabled = false }: { text: string; onChange(text: string): void; disabled?: boolean }) {
  const id = useId();
  const [layout, setLayout] = useState<NoteLayout>("lines");
  const [undo, setUndo] = useState<{ before: string; after: string } | null>(null);
  const [message, setMessage] = useState("");
  return <div className="note-formatting">
    <h3>Make your notes easier to paste</h3>
    <label className="board-layout" htmlFor={id}>Notes layout <select id={id} value={layout} disabled={disabled} onChange={e => setLayout(e.target.value as NoteLayout)}><option value="lines">Keep separate lines</option><option value="bullets">Bullet notes</option><option value="paragraphs">Paragraphs</option></select></label>
    <p className="muted">{layout === "lines" ? "Tidy extra spaces and blank lines while keeping each line separate." : layout === "bullets" ? "Make each non-empty line a bullet; existing numbered lists keep their numbers." : "Join wrapped lines into paragraphs. Blank lines separate paragraphs; marked lists stay on separate lines."} Wording, spelling, names and numbers stay as read. For tables, keep the original layout if spacing matters.</p>
    <div className="inline-buttons"><button className="button secondary" disabled={disabled || !text.trim()} onClick={() => {
      const next = formatNotes(text, layout);
      if (next !== text) { setUndo({ before: text, after: next }); onChange(next); setMessage("Layout tidied. Review the editable text, then copy it below."); }
      else setMessage("This text already uses the selected layout.");
    }}>Tidy layout</button><button className="text-button" disabled={disabled || !undo || undo.after !== text} onClick={() => { if (undo && undo.after === text) { onChange(undo.before); setUndo(null); setMessage("Original layout restored."); } }}>Undo formatting</button></div>
    {message && <p role="status">{message}</p>}
    <p className="muted">Formatting runs on your device and uses no OCR allowance. Copy text uses exactly what is shown in the editable notes.</p>
  </div>;
}
