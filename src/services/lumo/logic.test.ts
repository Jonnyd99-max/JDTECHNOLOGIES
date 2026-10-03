import { describe, expect, it } from "vitest";
import { WakePhraseDetector } from "./WakePhraseDetector";
import { DeterministicActionParser } from "./ActionParser";
import { ActionCaptureService } from "./ActionCaptureService";
describe("wake phrases", () => {
  const detector = new WakePhraseDetector();
  it.each([
    "Lumo take this action",
    "Lumo take an action",
    "Lumo action",
    "Lumo note this action",
    "Lumo take a note",
    "LUMA, take this action",
  ])("recognises %s", (phrase) =>
    expect(
      detector.detect(`${phrase}. Sarah to send the figures.`)?.instruction,
    ).toBe("Sarah to send the figures."),
  );
  it("ignores ordinary conversation", () => {
    expect(detector.detect("John will send figures tomorrow.")).toBeNull();
    expect(detector.detect("We need to take an action")).toBeNull();
  });
  it("supports standalone wake word", () =>
    expect(detector.detect("Lumo!")?.instruction).toBe(""));
  it.each(["Lumo", "Luma", "Loomo"])(
    "captures an instruction directly after %s",
    (word) => {
      expect(
        detector.detect(`${word} Olivia needs to get ready for bed`)
          ?.instruction,
      ).toBe("Olivia needs to get ready for bed");
    },
  );
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
  it("arms from interim wake text without saving interim instructions", () => {
    const capture = new ActionCaptureService();
    expect(capture.observePartial("Lumo")).toBe(true);
    capture.observePartial("Lumo Olivia needs");
    expect(capture.instruction).toBe("");
    capture.accept("Olivia needs to get ready for bed");
    expect(capture.flush()).toBe("Olivia needs to get ready for bed");
  });
  it("does not duplicate an interim phrase repeated in the final result", () => {
    const capture = new ActionCaptureService();
    capture.observePartial("Lumo Olivia needs");
    capture.accept("Lumo Olivia needs to get ready for bed");
    expect(capture.flush()).toBe("Olivia needs to get ready for bed");
  });
  it("combines separate speech events and ignores conversation after flush", () => {
    const capture = new ActionCaptureService();
    capture.accept("Lumo take this action.");
    capture.accept("James needs to check");
    capture.accept("the furnace loading.");
    expect(capture.flush()).toBe("James needs to check the furnace loading.");
    capture.accept("We are discussing costs now.");
    expect(capture.flush()).toBe("");
  });
  it("preserves two consecutive wake phrases", () => {
    const capture = new ActionCaptureService();
    capture.accept("Lumo action, James to check loading");
    expect(capture.accept("Lumo action, Sarah to send targets").previous).toBe(
      "James to check loading",
    );
    expect(capture.flush()).toBe("Sarah to send targets");
  });
});
