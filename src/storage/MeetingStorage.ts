import { defaultSettings, type Meeting, type Settings } from "../models";
export interface MeetingStorage {
  loadMeetings(): Meeting[];
  saveMeetings(meetings: Meeting[]): void;
  loadSettings(): Settings;
  saveSettings(settings: Settings): void;
}
function isMeeting(value: unknown): value is Meeting {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<Meeting>;
  return (
    typeof m.id === "string" &&
    typeof m.name === "string" &&
    typeof m.startedAt === "string" &&
    Number.isFinite(Date.parse(m.startedAt)) &&
    (m.status === "active" || m.status === "complete") &&
    Array.isArray(m.actions) &&
    m.actions.every(
      (a) =>
        typeof a.id === "string" &&
        typeof a.owner === "string" &&
        typeof a.description === "string",
    ) &&
    Array.isArray(m.transcript) &&
    m.transcript.every(
      (t) => typeof t.text === "string" && typeof t.timestamp === "string",
    )
  );
}
export class LocalMeetingStorage implements MeetingStorage {
  constructor(private storage: Storage = localStorage) {}
  loadMeetings(): Meeting[] {
    const raw = this.storage.getItem("jd.meetings.v1");
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data) || !data.every(isMeeting))
      throw new Error("Saved meeting data could not be read.");
    return data;
  }
  saveMeetings(meetings: Meeting[]): void {
    this.storage.setItem("jd.meetings.v1", JSON.stringify(meetings));
  }
  loadSettings(): Settings {
    const raw = this.storage.getItem("jd.settings.v1");
    if (!raw) return { ...defaultSettings };
    const value = JSON.parse(raw) as Partial<Settings>;
    const settings = { ...defaultSettings };
    for (const key of [
      "wakePhrase",
      "autoConfirm",
      "keepTranscript",
      "confirmEnd",
      "onboardingDone",
      "speechConsent",
    ] as const)
      if (typeof value[key] === "boolean") settings[key] = value[key];
    if (["dark", "light", "system"].includes(value.appearance || ""))
      settings.appearance = value.appearance!;
    if (["low", "normal", "high"].includes(value.intensity || ""))
      settings.intensity = value.intensity!;
    return settings;
  }
  saveSettings(settings: Settings): void {
    this.storage.setItem("jd.settings.v1", JSON.stringify(settings));
  }
}
