import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Copy, Plus, Pencil, Trash2, FileText } from "lucide-react";
import { useStore } from "../../storage/AppStore";
import { ActionEditor, ActionList } from "../../components/Actions";
import { PageHeading, Modal } from "../../components/UI";
import {
  dateLabel,
  duration,
  meetingSeconds,
  formatActions,
  formatSummary,
  timeLabel,
} from "../../utils/format";
import { copyText } from "../../services/clipboard";
import type { Action } from "../../models";
export function SummaryScreen() {
  const { id } = useParams();
  const { meetings, saveMeeting, removeMeeting } = useStore();
  const m = meetings.find((m) => m.id === id);
  const navigate = useNavigate();
  const [editor, setEditor] = useState<Action | "new" | null>(null);
  const [transcript, setTranscript] = useState(false);
  const [deletion, setDeletion] = useState<"meeting" | "transcript" | null>(
    null,
  );
  const [rename, setRename] = useState(false);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  if (!m)
    return (
      <div className="content-page">
        <PageHeading
          eyebrow="LUMO"
          title="Meeting not found"
          description="This meeting may have been deleted."
          back="/lumo/history"
        />
      </div>
    );
  const change = (a: Action) =>
    saveMeeting({
      ...m,
      actions: m.actions.some((item) => item.id === a.id)
        ? m.actions.map((item) => (item.id === a.id ? a : item))
        : [...m.actions, a],
    });
  const copy = async (summary: boolean) => {
    try {
      await copyText(summary ? formatSummary(m) : formatActions(m.actions));
      setNotice(
        summary ? "Meeting summary copied." : "Actions copied. Ready to share.",
      );
    } catch {
      setNotice(
        "Could not copy. Clipboard access requires HTTPS and permission.",
      );
    }
  };
  return (
    <div className="content-page summary-page">
      <PageHeading
        eyebrow="LUMO / MEETING SUMMARY"
        title="A conversation. A clear plan."
        back="/lumo/history"
      />
      <div className="summary-hero">
        <div className="complete-icon">
          <Check size={23} />
        </div>
        <div>
          <span className="eyebrow">MEETING COMPLETE</span>
          <h2>
            {m.name}
            <button
              className="icon-button"
              aria-label="Rename meeting"
              onClick={() => {
                setName(m.name);
                setRename(true);
              }}
            >
              <Pencil size={17} />
            </button>
          </h2>
          <p className="muted">
            {dateLabel(m.startedAt)} · {timeLabel(m.startedAt)}
          </p>
        </div>
        <div className="summary-stats">
          <div>
            <strong>{duration(meetingSeconds(m))}</strong>
            <span>Duration</span>
          </div>
          <div>
            <strong>{m.actions.length}</strong>
            <span>Actions captured</span>
          </div>
        </div>
      </div>
      <div className="section-heading">
        <h2>Action list</h2>
        <button
          className="button secondary small"
          onClick={() => setEditor("new")}
        >
          <Plus size={16} />
          Add action
        </button>
      </div>
      <ActionList
        actions={m.actions}
        onChange={change}
        onDelete={(actionId) =>
          saveMeeting({
            ...m,
            actions: m.actions.filter((a) => a.id !== actionId),
          })
        }
        onEdit={setEditor}
      />
      <div className="copy-buttons">
        <button className="button primary" onClick={() => void copy(false)}>
          <Copy size={18} />
          COPY ACTIONS
        </button>
        <button className="button secondary" onClick={() => void copy(true)}>
          Copy meeting summary
        </button>
      </div>
      <p role="status" className="notice">
        {notice}
      </p>
      <div className="summary-tools">
        <button className="text-button" onClick={() => setTranscript(true)}>
          <FileText size={17} />
          View transcript
        </button>
        <button
          className="text-button"
          onClick={() => setDeletion("transcript")}
        >
          Delete transcript
        </button>
        <button
          className="text-button danger-text"
          onClick={() => setDeletion("meeting")}
        >
          <Trash2 size={16} />
          Delete meeting
        </button>
      </div>
      {editor && (
        <ActionEditor
          meetingId={m.id}
          action={editor === "new" ? undefined : editor}
          onSave={change}
          onClose={() => setEditor(null)}
        />
      )}
      {rename && (
        <Modal title="Rename meeting" onClose={() => setRename(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMeeting({ ...m, name: name.trim() });
              setRename(false);
            }}
          >
            <label>
              Meeting name
              <input
                autoFocus
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="button primary full" disabled={!name.trim()}>
              Save name
            </button>
          </form>
        </Modal>
      )}
      {deletion && (
        <Modal title={`Delete ${deletion}?`} onClose={() => setDeletion(null)}>
          <p>
            This removes the{" "}
            {deletion === "meeting"
              ? "meeting, actions and transcript"
              : "transcript"}{" "}
            from this device.
          </p>
          <div className="dialog-buttons">
            <button
              className="button secondary"
              onClick={() => setDeletion(null)}
            >
              Cancel
            </button>
            <button
              className="button danger"
              onClick={() => {
                if (deletion === "meeting") {
                  removeMeeting(m.id);
                  navigate("/lumo/history");
                } else saveMeeting({ ...m, transcript: [] });
                setDeletion(null);
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
      {transcript && (
        <Modal title="Meeting transcript" onClose={() => setTranscript(false)}>
          <div className="transcript">
            {!m.transcript.length && (
              <p className="muted">No transcript is saved for this meeting.</p>
            )}
            {m.transcript.map((t) => (
              <div key={t.id}>
                <time>{timeLabel(t.timestamp)}</time>
                <p>{t.text}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
