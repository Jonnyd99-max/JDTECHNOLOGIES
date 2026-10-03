import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Mic,
  FileText,
  Square,
  ShieldCheck,
  ChevronDown,
  Check,
} from "lucide-react";
import { useMeetingSession } from "../../hooks/useMeetingSession";
import { useStore } from "../../storage/AppStore";
import { Orb } from "../../components/Orb";
import { ActionEditor, ActionList } from "../../components/Actions";
import { Modal } from "../../components/UI";
import { duration, meetingSeconds, timeLabel } from "../../utils/format";
import type { Action } from "../../models";
import {
  voicePrivacyNotice,
  voiceProviderId,
} from "../../services/audio/createTranscriptionProvider";
export function MeetingScreen() {
  const session = useMeetingSession();
  const { settings, updateSettings } = useStore();
  const hasVoiceConsent =
    settings.speechConsent &&
    settings.speechConsentProvider === voiceProviderId();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [editor, setEditor] = useState<Action | "new" | null>(null);
  const [endDialog, setEndDialog] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const [consent, setConsent] = useState(false);
  const [example, setExample] = useState(
    "Lumo take this action, James needs to check the furnace loading.",
  );
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (hasVoiceConsent) void session.startVoice();
    else setConsent(true);
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const enable = () =>
    hasVoiceConsent ? void session.startVoice() : setConsent(true);
  const finish = () =>
    navigate(`/lumo/history/${session.end()}`, { replace: true });
  const latest = session.meeting.actions.findLast((a) => !a.confirmed);
  return (
    <div className="meeting-screen">
      <div className="meeting-top">
        <span className="pill active">
          <span className="tiny-dot" /> MEETING IN PROGRESS
        </span>
        <span className="timer">
          {duration(
            meetingSeconds({
              ...session.meeting,
              endedAt: new Date(now).toISOString(),
            }),
          )}
        </span>
      </div>
      <div className="meeting-orb">
        <Orb state={session.state} />
        <h1 className="meeting-status" aria-live="polite">
          {session.state === "recording" || session.state === "wake"
            ? "Listening…"
            : session.state === "processing"
              ? "Processing…"
              : session.state === "captured"
                ? "Action captured"
                : session.voice
                  ? settings.wakePhrase
                    ? "Listening for “Lumo”"
                    : "Transcribing meeting"
                  : "Ready when you are."}
        </h1>
        <p className="muted status-detail" role="status">
          {session.message}
        </p>
        {!session.voice && (
          <button className="button secondary" onClick={enable}>
            <Mic size={18} />
            Enable voice
          </button>
        )}
        {session.voice && (
          <button className="text-button" onClick={session.stop}>
            Pause voice
          </button>
        )}
      </div>
      {latest && (
        <div className="capture-card">
          <div className="capture-label">
            <Check size={16} />
            ACTION CAPTURED · REVIEW
          </div>
          <strong>{latest.owner}</strong>
          <p>{latest.description}</p>
          <div className="inline-buttons">
            <button className="text-button" onClick={() => setEditor(latest)}>
              Edit
            </button>
            <button
              className="text-button"
              onClick={() => session.deleteAction(latest.id)}
            >
              Delete
            </button>
            <button
              className="button secondary small"
              onClick={() =>
                session.updateAction({ ...latest, confirmed: true })
              }
            >
              Confirm
            </button>
          </div>
        </div>
      )}
      <section className="meeting-actions">
        <details open>
          <summary>
            <span>
              Captured actions{" "}
              <span className="count">{session.meeting.actions.length}</span>
            </span>
            <ChevronDown size={18} />
          </summary>
          <ActionList
            actions={session.meeting.actions}
            onChange={session.updateAction}
            onDelete={session.deleteAction}
            onEdit={setEditor}
          />
        </details>
        <button
          className="text-button add-action"
          onClick={() => setEditor("new")}
        >
          <Plus size={18} />
          Add action
        </button>
      </section>
      <button className="button ghost full" onClick={() => setTranscript(true)}>
        <FileText size={17} />
        View transcript{" "}
        <span className="muted">
          {session.meeting.transcript.length} entries
        </span>
      </button>
      {import.meta.env.DEV && (
        <details className="dev-controls">
          <summary>Development controls</summary>
          <label>
            Example speech
            <textarea
              value={example}
              onChange={(e) => setExample(e.target.value)}
            />
          </label>
          <div className="inline-buttons">
            <button
              className="button secondary small"
              onClick={session.simulateWake}
            >
              Simulate wake phrase
            </button>
            <button
              className="button secondary small"
              onClick={() => session.simulate(example)}
            >
              Simulate action
            </button>
          </div>
        </details>
      )}
      <div className="end-area">
        <p className="privacy-caption">
          <ShieldCheck size={14} /> Saved on this device as you go
        </p>
        <button
          className="button end-button full"
          onClick={() => (settings.confirmEnd ? setEndDialog(true) : finish())}
        >
          <Square size={16} />
          END MEETING
        </button>
      </div>
      {editor && (
        <ActionEditor
          action={editor === "new" ? undefined : editor}
          meetingId={session.meeting.id}
          onSave={session.updateAction}
          onClose={() => setEditor(null)}
        />
      )}
      {endDialog && (
        <Modal title="End this meeting?" onClose={() => setEndDialog(false)}>
          <p className="muted">
            Lumo will stop listening and save your meeting and{" "}
            {session.meeting.actions.length} actions.
          </p>
          <div className="dialog-buttons">
            <button
              className="button secondary"
              onClick={() => setEndDialog(false)}
            >
              Cancel
            </button>
            <button className="button primary" onClick={finish}>
              End meeting
            </button>
          </div>
        </Modal>
      )}
      {consent && (
        <Modal
          title="Enable voice recognition"
          onClose={() => setConsent(false)}
        >
          <p>{voicePrivacyNotice()}</p>
          <p className="muted">
            Only enable voice with the agreement of everyone in the meeting. You
            can use manual actions without enabling voice.
          </p>
          <div className="dialog-buttons">
            <button
              className="button secondary"
              onClick={() => setConsent(false)}
            >
              Use manually
            </button>
            <button
              className="button primary"
              onClick={() => {
                updateSettings({
                  speechConsent: true,
                  speechConsentProvider: voiceProviderId(),
                });
                setConsent(false);
                void session.startVoice();
              }}
            >
              Enable voice
            </button>
          </div>
        </Modal>
      )}
      {transcript && (
        <Modal title="Meeting transcript" onClose={() => setTranscript(false)}>
          <div className="transcript">
            {session.meeting.transcript.length === 0 && (
              <p className="muted">
                Your transcribed speech will appear here when voice is enabled.
              </p>
            )}
            {session.meeting.transcript.map((t) => (
              <div key={t.id}>
                <time>{timeLabel(t.timestamp)}</time>
                <p>{t.text}</p>
              </div>
            ))}
            {session.partial && <p className="muted">{session.partial}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
