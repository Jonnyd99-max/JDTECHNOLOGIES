import { describe, expect, it } from "vitest";
import { WakePhraseDetector } from "./WakePhraseDetector";
import { DeterministicActionParser } from "./ActionParser";
import { ActionCaptureService } from "./ActionCaptureService";
describe("action trigger", () => {
  const detector = new WakePhraseDetector();
  it.each([
    "Take this action",
    "TAKE THIS ACTION",
    "take   this action",
    "Take, this, action",
    "Limo take this action",
  ])("recognises %s", (phrase) => {
    expect(
      detector.detect(`${phrase}: Olivia needs to get ready for bed`)
        ?.instruction,
    ).toBe("Olivia needs to get ready for bed");
  });
  it("opens capture without an instruction", () => {
    expect(detector.detect("take this action!")?.instruction).toBe("");
  });
  it.each([
    "John will send figures tomorrow.",
    "Lumo Olivia needs to get ready for bed",
    "Limos are expensive",
    "We need to take an action",
    "take this actionable item",
  ])("ignores %s", (text) => {
    expect(detector.detect(text)).toBeNull();
  });
});
describe("action parsing", () => {
  const parser = new DeterministicActionParser();
  it.each([
    [
      "James needs to check furnace loading before tomorrow.",
      "James",
      "Check furnace loading before tomorrow",
    ],
    ["Sarah to update the IRD targets.", "Sarah", "Update the IRD targets"],
    [
      "I need to confirm the scheduler trial date.",
      "Me",
      "Confirm the scheduler trial date",
    ],
    ["John Smith will send the figures.", "John Smith", "Send the figures"],
  ])("parses %s", (text, owner, description) => {
    const a = parser.parse(text, "meeting");
    expect(a.owner).toBe(owner);
    expect(a.description).toBe(description);
    expect(a.meetingId).toBe("meeting");
    expect(a.status).toBe("open");
    expect(a.sourceText).toBe(text);
  });
  it("keeps unclear instructions for review", () =>
    expect(parser.parse("Check the schedule", "m").owner).toBe("Unassigned"));
});
describe("action capture boundaries", () => {
  it("arms from interim trigger without saving interim instructions", () => {
    const capture = new ActionCaptureService();
    expect(capture.observePartial("take this")).toBe(false);
    expect(capture.observePartial("take this action")).toBe(true);
    capture.observePartial("take this action Olivia needs");
    expect(capture.instruction).toBe("");
    capture.accept("Olivia needs to get ready for bed");
    expect(capture.flush()).toBe("Olivia needs to get ready for bed");
  });
  it("does not duplicate interim text repeated in a final result", () => {
    const capture = new ActionCaptureService();
    capture.observePartial("take this action Olivia needs");
    capture.accept("take this action Olivia needs to get ready for bed");
    expect(capture.flush()).toBe("Olivia needs to get ready for bed");
  });
  it("combines separate instruction events and ignores conversation after flush", () => {
    const capture = new ActionCaptureService();
    capture.accept("take this action.");
    capture.accept("James needs to check");
    capture.accept("the furnace loading.");
    expect(capture.flush()).toBe("James needs to check the furnace loading.");
    capture.accept("We are discussing costs now.");
    expect(capture.flush()).toBe("");
  });
  it("recognises a trigger split across final events", () => {
    const capture = new ActionCaptureService();
    capture.accept("take");
    capture.accept("this");
    capture.accept("action, Olivia needs to get ready for bed");
    expect(capture.flush()).toBe("Olivia needs to get ready for bed");
  });
  it("strips a split trigger completed by interim and final events", () => {
    const capture = new ActionCaptureService();
    capture.accept("take this");
    expect(capture.observePartial("action Olivia needs")).toBe(true);
    capture.accept("action Olivia needs to get ready for bed");
    expect(capture.flush()).toBe("Olivia needs to get ready for bed");
  });
  it("discards an interrupted trigger", () => {
    const capture = new ActionCaptureService();
    capture.accept("take");
    capture.accept("a break");
    capture.accept("this action is complete");
    expect(capture.flush()).toBe("");
  });
  it("preserves two consecutive triggers", () => {
    const capture = new ActionCaptureService();
    capture.accept("take this action, James to check loading");
    expect(
      capture.accept("take this action, Sarah to send targets").previous,
    ).toBe("James to check loading");
    expect(capture.flush()).toBe("Sarah to send targets");
  });
});
