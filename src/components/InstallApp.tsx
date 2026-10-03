import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Download } from "lucide-react";
import { Modal } from "./UI";
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export function InstallApp({ hidden }: { hidden: boolean }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const display = matchMedia("(display-mode: standalone)");
    const update = () =>
      setInstalled(display.matches || Capacitor.isNativePlatform());
    const available = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
      setHelp(false);
    };
    update();
    display.addEventListener("change", update);
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", done);
    return () => {
      display.removeEventListener("change", update);
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  const install = async () => {
    if (!prompt) {
      setHelp(true);
      return;
    }
    setBusy(true);
    setPrompt(null); // Each browser event can only be used once.
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "dismissed") setHelp(true);
    } catch {
      setHelp(true);
    } finally {
      setBusy(false);
    }
  };
  if (hidden || installed) return null;
  return (
    <>
      <div className="banner">
        <span>Keep JD Technology on your home screen.</span>
        <button
          className="button secondary small"
          disabled={busy}
          onClick={() => void install()}
        >
          <Download size={16} /> {busy ? "Opening install…" : "Install app"}
        </button>
      </div>
      {help && (
        <Modal title="Install JD Technology" onClose={() => setHelp(false)}>
          <p>
            In Chrome on Android, open the ⋮ menu and choose{" "}
            <strong>Add to Home screen</strong>, then <strong>Install</strong>{" "}
            if offered.
          </p>
          <p className="muted">
            Chrome controls when its install prompt is available. After removing
            the app, reopen this page in Chrome and try again. If you use Safari
            on iPhone, choose Share → Add to Home Screen.
          </p>
          <button className="button secondary" onClick={() => setHelp(false)}>
            Got it
          </button>
        </Modal>
      )}
    </>
  );
}
