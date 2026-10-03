import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Clock3, Plus, Trash2 } from "lucide-react";
import { PageHeading, Modal } from "../../components/UI";
import { useStore } from "../../storage/AppStore";
import {
  dateLabel,
  duration,
  meetingSeconds,
  timeLabel,
} from "../../utils/format";
export function HistoryScreen() {
  const { meetings, clearMeetings } = useStore();
  const [clear, setClear] = useState(false);
  return (
    <div className="content-page">
      <PageHeading
        eyebrow="LUMO / YOUR MEETINGS"
        title="A little less to remember."
        description="Your conversations. Your actions. All in one place."
      >
        <Link className="button secondary" to="/lumo/meeting">
          <Plus size={18} />
          New meeting
        </Link>
      </PageHeading>
      <div className="section-heading">
        <h2>
          Meeting history <span className="count">{meetings.length}</span>
        </h2>
        {meetings.length > 0 && (
          <button
            className="text-button danger-text"
            onClick={() => setClear(true)}
          >
            <Trash2 size={16} />
            Clear history
          </button>
        )}
      </div>
      {!meetings.length && (
        <div className="empty-state">
          <CalendarDays size={35} />
          <h2>Your first meeting starts here.</h2>
          <p className="muted">
            Every captured action will have a place to come back to.
          </p>
          <Link className="button primary" to="/lumo/meeting">
            Start a meeting
          </Link>
        </div>
      )}
      <div className="history-grid">
        {meetings.map((m) => (
          <Link
            className="history-card"
            key={m.id}
            to={
              m.status === "active" ? "/lumo/meeting" : `/lumo/history/${m.id}`
            }
          >
            <div className="card-top">
              <span className="eyebrow">{dateLabel(m.startedAt)}</span>
              <ArrowUpRight size={20} />
            </div>
            <h2>{m.name}</h2>
            <div className="history-meta">
              <span>
                <Clock3 size={14} />
                {timeLabel(m.startedAt)} · {duration(meetingSeconds(m))}
              </span>
              <span>{m.actions.length} actions</span>
            </div>
            {m.status === "active" && (
              <span className="pill active">Unfinished · resume meeting</span>
            )}
          </Link>
        ))}
      </div>
      {clear && (
        <Modal
          title="Clear all meeting history?"
          onClose={() => setClear(false)}
        >
          <p>
            This deletes every meeting, action and transcript from this device.
            Copy any actions you need first.
          </p>
          <div className="dialog-buttons">
            <button
              className="button secondary"
              onClick={() => setClear(false)}
            >
              Cancel
            </button>
            <button
              className="button danger"
              onClick={() => {
                clearMeetings();
                setClear(false);
              }}
            >
              Delete all meetings
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
