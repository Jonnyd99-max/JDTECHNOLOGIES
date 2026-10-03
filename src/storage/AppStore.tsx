import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LocalMeetingStorage } from "./MeetingStorage";
import { defaultSettings, type Meeting, type Settings } from "../models";
const storage = new LocalMeetingStorage();
interface Store {
  meetings: Meeting[];
  settings: Settings;
  error: string;
  clearError(): void;
  saveMeeting(m: Meeting): boolean;
  removeMeeting(id: string): boolean;
  clearMeetings(): boolean;
  deleteTranscripts(): boolean;
  updateSettings(patch: Partial<Settings>): void;
}
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    let meetings: Meeting[] = [];
    let settings: Settings = { ...defaultSettings };
    let error = "";
    let protectedData = false;
    try {
      meetings = storage.loadMeetings();
    } catch {
      protectedData = true;
      error =
        "Saved meetings could not be loaded. Existing storage has been preserved. Reload, or delete all meeting data in Settings to reset it. New meetings can be copied but cannot be saved until this is resolved.";
    }
    try {
      settings = storage.loadSettings();
    } catch {
      error += " Settings could not be loaded; defaults are being used.";
    }
    return { meetings, settings, error, protectedData };
  });
  const protectedData = useRef(initial.protectedData);
  const [meetings, setMeetings] = useState(initial.meetings);
  const [settings, setSettings] = useState(initial.settings);
  const [error, setError] = useState(initial.error);
  const persist = (next: Meeting[], reset = false): boolean => {
    setMeetings(next);
    if (protectedData.current && !reset) {
      setError(initial.error);
      return false;
    }
    try {
      storage.saveMeetings(next);
      return true;
    } catch {
      setError(
        "Meeting data could not be saved on this device. Keep this page open and copy your actions before closing. Free device space and retry.",
      );
      return false;
    }
  };
  const value: Store = {
    meetings,
    settings,
    error,
    clearError: () => setError(""),
    saveMeeting: (m) =>
      persist([m, ...meetings.filter((item) => item.id !== m.id)]),
    removeMeeting: (id) => persist(meetings.filter((m) => m.id !== id)),
    clearMeetings: () => {
      const ok = persist([], true);
      if (ok) {
        protectedData.current = false;
        setError("");
      }
      return ok;
    },
    deleteTranscripts: () =>
      persist(meetings.map((m) => ({ ...m, transcript: [] }))),
    updateSettings: (patch) => {
      const next = { ...settings, ...patch };
      try {
        storage.saveSettings(next);
        setSettings(next);
      } catch {
        setError(
          "Settings could not be saved. Free device space and try again.",
        );
      }
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStore(): Store {
  const store = useContext(Context);
  if (!store) throw new Error("StoreProvider missing");
  return store;
}
