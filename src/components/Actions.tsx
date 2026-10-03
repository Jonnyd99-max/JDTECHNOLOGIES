import { useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import type { Action } from "../models";
import { Modal } from "./UI";
export function ActionEditor({
  action,
  meetingId,
  onSave,
  onClose,
}: {
  action?: Action;
  meetingId: string;
  onSave(a: Action): void;
  onClose(): void;
}) {
  const [owner, setOwner] = useState(action?.owner || "Me");
  const [description, setDescription] = useState(action?.description || "");
  const [dueDate, setDueDate] = useState(action?.dueDate || "");
  return (
    <Modal title={action ? "Edit action" : "Add an action"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            id: action?.id || crypto.randomUUID(),
            createdAt: action?.createdAt || new Date().toISOString(),
            sourceText: action?.sourceText || description,
            status: action?.status || "open",
            meetingId,
            ...action,
            owner: owner.trim(),
            description: description.trim(),
            dueDate: dueDate || undefined,
            confirmed: true,
          });
          onClose();
        }}
      >
        <label>
          Owner
          <input
            autoFocus
            required
            maxLength={80}
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Who will do it?"
          />
        </label>
        <label>
          Action
          <textarea
            required
            maxLength={2000}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What needs to happen?"
          />
        </label>
        <label>
          Due date <span className="muted">(optional)</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        <button
          disabled={!owner.trim() || !description.trim()}
          className="button primary full"
        >
          Save action
        </button>
      </form>
    </Modal>
  );
}
export function ActionList({
  actions,
  onChange,
  onDelete,
  onEdit,
}: {
  actions: Action[];
  onChange(a: Action): void;
  onDelete(id: string): void;
  onEdit(a: Action): void;
}) {
  return (
    <div className="action-list">
      {!actions.length && (
        <div className="empty-small">
          A clear next step starts here.
          <br />
          <span className="muted">
            Capture an action with your voice or add one manually.
          </span>
        </div>
      )}
      {actions.map((a, i) => (
        <article
          key={a.id}
          className={`action-row ${a.status === "complete" ? "completed" : ""}`}
        >
          <button
            className="check-button"
            aria-label={`${a.status === "complete" ? "Reopen" : "Complete"} action: ${a.description}`}
            aria-pressed={a.status === "complete"}
            onClick={() =>
              onChange({
                ...a,
                status: a.status === "open" ? "complete" : "open",
              })
            }
          >
            {a.status === "complete" ? (
              <Check size={16} />
            ) : (
              <span>{String(i + 1).padStart(2, "0")}</span>
            )}
          </button>
          <div className="action-copy">
            <strong>{a.owner}</strong>
            <p>{a.description}</p>
            {a.dueDate && <small>Due {a.dueDate}</small>}
            {!a.confirmed && (
              <button
                className="text-button"
                onClick={() => onChange({ ...a, confirmed: true })}
              >
                Confirm action
              </button>
            )}
          </div>
          <button
            className="icon-button"
            aria-label={`Edit action for ${a.owner}`}
            onClick={() => onEdit(a)}
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon-button"
            aria-label={`Delete action for ${a.owner}`}
            onClick={() => onDelete(a.id)}
          >
            <Trash2 size={16} />
          </button>
        </article>
      ))}
    </div>
  );
}
