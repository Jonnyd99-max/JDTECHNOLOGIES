import { useEffect, useRef, useState } from "react";
import { findBoardLines, type BoardLine } from "./boardLines";
import { cropHandwritingLine, startHandwritingBatch } from "./handwriting";
import { copyText } from "../../services/clipboard";
import "./boardLines.css";
interface ReadingLine {
  box: BoardLine;
  crop: string;
  selected: boolean;
  text: string;
  read: boolean;
}
export function DetectedHandwriting({ image }: { image: string }) {
  const [ink, setInk] = useState<"blue" | "dark">("blue"),
    [straighten, setStraighten] = useState(false);
  const [lines, setLines] = useState<ReadingLine[]>([]),
    [message, setMessage] = useState(""),
    [running, setRunning] = useState(false);
  const active = useRef<ReturnType<typeof startHandwritingBatch> | null>(null),
    version = useRef(0);
  useEffect(() => {
    version.current++;
    setLines([]);
    setMessage("");
    setRunning(false);
    return () => {
      version.current++;
      active.current?.cancel();
      active.current = null;
    };
  }, [image]);
  async function detect() {
    const id = ++version.current;
    setRunning(true);
    setMessage("Finding handwritten lines…");
    setLines([]);
    try {
      const boxes = await findBoardLines(image, ink);
      const found: ReadingLine[] = [];
      for (const box of boxes) {
        if (id !== version.current) return;
        found.push({
          box,
          crop: await cropHandwritingLine(
            image,
            box,
            true,
            straighten ? box.angle : 0,
          ),
          selected: true,
          text: "",
          read: false,
        });
      }
      if (id === version.current) {
        setLines(found);
        setMessage(
          found.length
            ? `Found ${found.length} possible lines. Check the crops and deselect drawings or incomplete lines before reading.`
            : "No clear lines found. Try the other marker ink option or crop closer to the writing.",
        );
      }
    } catch (error) {
      if (id === version.current)
        setMessage(
          error instanceof Error ? error.message : "Could not find lines.",
        );
    } finally {
      if (id === version.current) setRunning(false);
    }
  }
  async function read() {
    const selected = lines
      .map((line, index) => ({ line, index }))
      .filter((item) => item.line.selected);
    if (!selected.length || running) return;
    const id = ++version.current;
    setRunning(true);
    try {
      const job = startHandwritingBatch(
        selected.map((item) => item.line.crop),
        (value) => {
          if (id === version.current) setMessage(value);
        },
      );
      active.current = job;
      const readings = await job.promise;
      if (id === version.current) {
        setLines((previous) =>
          previous.map((line, index) => {
            const position = selected.findIndex((item) => item.index === index);
            return position < 0
              ? line
              : { ...line, text: readings[position] || "", read: true };
          }),
        );
        setMessage(
          "Suggested readings only. Check every line against its crop, especially names and technical codes.",
        );
      }
    } catch {
      if (id === version.current)
        setMessage("Reading stopped or failed. You can retry selected lines.");
    } finally {
      if (id === version.current) {
        active.current = null;
        setRunning(false);
      }
    }
  }
  async function copy() {
    try {
      await copyText(
        lines
          .filter((line) => line.selected && line.read)
          .map((line) => line.text)
          .filter(Boolean)
          .join("\n"),
      );
      setMessage("Selected readings copied. Check them before sharing.");
    } catch {
      setMessage("Could not copy. Select and copy the readings manually.");
    }
  }
  return (
    <section className="board-controls" aria-labelledby="detected-heading">
      <h2 id="detected-heading">
        Handwriting first <span className="muted">· experimental</span>
      </h2>
      <p>
        Find separate lines without drawing a box around each one. Review the
        crops, then read selected lines individually.
      </p>
      <p className="muted">
        Free and on-device. Uses the same handwriting reader download. Line
        detection can miss writing or include diagrams; readings can still be
        wrong.
      </p>
      <div className="board-settings">
        <label>
          Marker ink
          <select
            aria-label="Marker ink"
            value={ink}
            disabled={running}
            onChange={(event) => {
              setInk(event.target.value as "blue" | "dark");
              setLines([]);
            }}
          >
            <option value="blue">Blue marker</option>
            <option value="dark">Black / dark marker</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={straighten}
            disabled={running}
            onChange={(event) => {
              setStraighten(event.target.checked);
              setLines([]);
            }}
          />{" "}
          Straighten detected lines (may change readings)
        </label>
      </div>
      <div className="inline-buttons">
        <button
          className="button secondary"
          disabled={running}
          onClick={() => void detect()}
        >
          Find handwriting lines
        </button>
        {lines.length > 0 && (
          <button
            className="button primary"
            disabled={running || !lines.some((line) => line.selected)}
            onClick={() => void read()}
          >
            Read selected lines
          </button>
        )}
        {running && active.current && (
          <button
            className="button secondary"
            onClick={() => active.current?.cancel()}
          >
            Cancel
          </button>
        )}
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {lines.map((line, index) => (
        <div className="detected-line" key={index}>
          <label>
            <input
              type="checkbox"
              disabled={running}
              checked={line.selected}
              onChange={(event) =>
                setLines((previous) =>
                  previous.map((item, i) =>
                    i === index
                      ? { ...item, selected: event.target.checked }
                      : item,
                  ),
                )
              }
            />{" "}
            Line {index + 1}
          </label>
          <img src={line.crop} alt={`Detected handwriting line ${index + 1}`} />
          {line.read && (
            <label>
              Suggested line {index + 1} (editable)
              <textarea
                className="board-text"
                rows={2}
                disabled={running}
                value={line.text}
                onChange={(event) =>
                  setLines((previous) =>
                    previous.map((item, i) =>
                      i === index
                        ? { ...item, text: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </label>
          )}
        </div>
      ))}
      {lines.some((line) => line.selected && line.read && line.text.trim()) && (
        <button
          className="button secondary"
          disabled={running}
          onClick={() => void copy()}
        >
          Copy selected readings
        </button>
      )}
    </section>
  );
}
