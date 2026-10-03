// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import { LocalMeetingStorage } from "./MeetingStorage";
import { defaultSettings, type Meeting } from "../models";
const storage = new LocalMeetingStorage();
it("requires fresh provider consent for settings from earlier versions", () => {
  localStorage.setItem(
    "jd.settings.v1",
    JSON.stringify({ speechConsent: true }),
  );
  expect(storage.loadSettings().speechConsentProvider).toBe("");
});
const meeting: Meeting = {
  id: "m",
  name: "Meeting",
  startedAt: new Date().toISOString(),
  actions: [],
  transcript: [],
  status: "active",
};
beforeEach(() => localStorage.clear());
it("round trips active meetings for crash recovery", () => {
  storage.saveMeetings([meeting]);
  expect(new LocalMeetingStorage().loadMeetings()).toEqual([meeting]);
});
it("persists settings independently from meetings", () => {
  storage.saveSettings({ ...defaultSettings, intensity: "low" });
  storage.saveMeetings([meeting]);
  storage.saveMeetings([]);
  expect(storage.loadSettings().intensity).toBe("low");
  expect(storage.loadMeetings()).toEqual([]);
});
it("does not silently overwrite corrupt storage", () => {
  localStorage.setItem("jd.meetings.v1", "{broken");
  expect(() => storage.loadMeetings()).toThrow();
  expect(localStorage.getItem("jd.meetings.v1")).toBe("{broken");
});
it("rejects invalid meeting records", () => {
  localStorage.setItem("jd.meetings.v1", '[{"id":"m"}]');
  expect(() => storage.loadMeetings()).toThrow();
});
it("propagates storage failures so UI can report them", () => {
  const failing = {
    setItem() {
      throw new Error("quota");
    },
  } as unknown as Storage;
  expect(() =>
    new LocalMeetingStorage(failing).saveMeetings([meeting]),
  ).toThrow("quota");
});
