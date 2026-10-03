import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  History,
  Settings2,
  ShieldCheck,
  AudioLines,
} from "lucide-react";
import { Orb } from "../../components/Orb";
import { useStore } from "../../storage/AppStore";
import { voicePrivacyNotice } from "../../services/audio/createTranscriptionProvider";
export function LumoHome() {
  const { settings, updateSettings, meetings } = useStore();
  const [step, setStep] = useState(0);
  const active = meetings.find((m) => m.status === "active");
  if (!settings.onboardingDone) {
    const screens = [
      {
        title: "Meet Lumo.",
        description:
          "Your voice-enabled meeting assistant. Stay present, capture the important things, and leave with a clear plan.",
        eyebrow: "A LITTLE LESS TO REMEMBER",
      },
      {
        title: "Say it. Capture it.",
        description:
          "Say “Lumo take this action…” followed by the owner and task. For example: “James needs to check furnace loading.”",
        eyebrow: "CAPTURE ACTIONS NATURALLY",
      },
      {
        title: "Your meetings stay yours.",
        description: `Meeting data stays on this device. ${voicePrivacyNotice()} You choose when to enable voice.`,
        eyebrow: "PRIVACY, BUILT IN",
      },
    ];
    return (
      <div className="lumo-home onboarding">
        <p className="eyebrow">LUMO / GETTING STARTED</p>
        <Orb />
        <p className="eyebrow">{screens[step].eyebrow}</p>
        <h1>{screens[step].title}</h1>
        <p className="intro-copy">{screens[step].description}</p>
        <div className="step-dots">
          {screens.map((_, i) => (
            <span key={i} className={i === step ? "selected" : ""} />
          ))}
        </div>
        <button
          className="button primary"
          onClick={() =>
            step < 2
              ? setStep(step + 1)
              : updateSettings({ onboardingDone: true })
          }
        >
          {step < 2 ? "Continue" : "Start using Lumo"}
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }
  return (
    <div className="lumo-home">
      <div className="lumo-brand">
        <span className="pill active">YOUR MEETING ASSISTANT</span>
        <h1>
          Lumo<span className="orange">.</span>
        </h1>
        <p className="muted">Be in the moment. Leave with a plan.</p>
      </div>
      <Orb />
      <p className="listen-tagline">
        Listen <i /> Capture <i /> Act
      </p>
      <Link className="button primary start-button" to="/lumo/meeting">
        <AudioLines size={20} />
        {active ? "RESUME MEETING" : "START MEETING"}
        <ArrowRight size={19} />
      </Link>
      {active && (
        <p className="recovery-note">
          An unfinished meeting is saved. Resume to review and continue.
        </p>
      )}
      <div className="home-shortcuts">
        <Link to="/lumo/history">
          <History size={19} />
          Meeting history
          <ArrowRight size={16} />
        </Link>
        <Link to="/lumo/settings">
          <Settings2 size={19} />
          Settings
          <ArrowRight size={16} />
        </Link>
      </div>
      <p className="privacy-caption">
        <ShieldCheck size={15} /> Your meeting data stays on this device.
      </p>
    </div>
  );
}
