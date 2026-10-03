export type OrbState =
  | "idle"
  | "waiting"
  | "wake"
  | "recording"
  | "processing"
  | "captured"
  | "error";
export interface Action {
  id: string;
  owner: string;
  description: string;
  createdAt: string;
  sourceText: string;
  status: "open" | "complete";
  meetingId: string;
  dueDate?: string;
  confidence?: number;
  confirmed: boolean;
}
export interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: string;
}
export interface Meeting {
  id: string;
  name: string;
  startedAt: string;
  endedAt?: string;
  actions: Action[];
  transcript: TranscriptEntry[];
  status: "active" | "complete";
}
export interface Settings {
  wakePhrase: boolean;
  autoConfirm: boolean;
  keepTranscript: boolean;
  confirmEnd: boolean;
  appearance: "dark" | "light" | "system";
  intensity: "low" | "normal" | "high";
  onboardingDone: boolean;
  speechConsent: boolean;
}
export const defaultSettings: Settings = {
  wakePhrase: true,
  autoConfirm: false,
  keepTranscript: true,
  confirmEnd: true,
  appearance: "dark",
  intensity: "normal",
  onboardingDone: false,
  speechConsent: false,
};
