import { useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { useStore } from "../../storage/AppStore";
import { PageHeading, Modal } from "../../components/UI";
import type { Settings } from "../../models";
function Toggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <label className="setting-row">
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        className="toggle"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
export function SettingsScreen() {
  const { settings, updateSettings, clearMeetings, deleteTranscripts } =
    useStore();
  const [deletion, setDeletion] = useState<"meetings" | "transcripts" | null>(
    null,
  );
  return (
    <div className="content-page settings-page">
      <PageHeading
        eyebrow="LUMO / SETTINGS"
        title="Make it yours."
        description="A few thoughtful controls. Just the way you work."
      />
      <section className="settings-section">
        <h2>Lumo</h2>
        <div className="settings-card">
          <Toggle
            title="Wake phrase"
            description="Listen for “Lumo take this action” during meetings."
            checked={settings.wakePhrase}
            onChange={(wakePhrase) => updateSettings({ wakePhrase })}
          />
          <Toggle
            title="Automatically confirm actions"
            description="Save captured actions without asking for a review."
            checked={settings.autoConfirm}
            onChange={(autoConfirm) => updateSettings({ autoConfirm })}
          />
          <Toggle
            title="Keep meeting transcripts"
            description="Keep the transcript when a meeting ends."
            checked={settings.keepTranscript}
            onChange={(keepTranscript) => updateSettings({ keepTranscript })}
          />
          <Toggle
            title="Confirm before ending"
            description="A small safeguard against an accidental tap."
            checked={settings.confirmEnd}
            onChange={(confirmEnd) => updateSettings({ confirmEnd })}
          />
        </div>
      </section>
      <section className="settings-section">
        <h2>Appearance</h2>
        <div className="settings-card">
          <label className="setting-row">
            <span>
              <strong>Colour theme</strong>
              <small>Set the mood for your workspace.</small>
            </span>
            <select
              value={settings.appearance}
              onChange={(e) =>
                updateSettings({
                  appearance: e.target.value as Settings["appearance"],
                })
              }
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </label>
          <label className="setting-row">
            <span>
              <strong>Orb animation</strong>
              <small>Find a comfortable level of movement.</small>
            </span>
            <select
              value={settings.intensity}
              onChange={(e) =>
                updateSettings({
                  intensity: e.target.value as Settings["intensity"],
                })
              }
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>
      </section>
      <section className="settings-section">
        <h2>Privacy</h2>
        <div className="privacy-info">
          <ShieldCheck size={24} />
          <div>
            <strong>Your meetings stay yours.</strong>
            <p>
              Meeting data is stored locally on this device unless an external
              transcription service is configured.
            </p>
            <p className="muted">
              The current browser speech provider may send audio to the browser
              vendor for recognition. Raw audio is never saved by Lumo. Voice
              may not work offline. Device data is not encrypted by this app and
              is not synced across devices.
            </p>
          </div>
        </div>
        <div className="settings-card">
          <button
            className="setting-row setting-button"
            onClick={() => setDeletion("transcripts")}
          >
            Delete all transcripts
            <Trash2 size={18} />
          </button>
          <button
            className="setting-row setting-button danger-text"
            onClick={() => setDeletion("meetings")}
          >
            Delete all meeting data
            <Trash2 size={18} />
          </button>
          <button
            className="setting-row setting-button"
            onClick={() => updateSettings({ speechConsent: false })}
          >
            Ask for voice consent again
            <ShieldCheck size={18} />
          </button>
        </div>
      </section>
      <section className="settings-section">
        <h2>About</h2>
        <div className="settings-card">
          <div className="setting-row">
            <strong>JD Technology</strong>
            <span className="muted">Lumo 1.0.0 · Build 1.0.0</span>
          </div>
          <button
            className="setting-row setting-button"
            onClick={() => updateSettings({ onboardingDone: false })}
          >
            Show Lumo onboarding again<span>↗</span>
          </button>
        </div>
      </section>
      {deletion && (
        <Modal
          title={`Delete all ${deletion}?`}
          onClose={() => setDeletion(null)}
        >
          <p>
            This permanently removes saved{" "}
            {deletion === "meetings"
              ? "meetings, actions and transcripts"
              : "transcripts"}{" "}
            from this device. Copy anything you need first.
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
                if (deletion === "meetings") clearMeetings();
                else deleteTranscripts();
                setDeletion(null);
              }}
            >
              Delete all {deletion}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
