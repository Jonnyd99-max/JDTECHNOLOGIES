import { describe, expect, it } from "vitest";
import {
  finalTranscriptSegments,
  interimTranscript,
} from "./interimTranscript";
const revisions = [
  "Hi",
  "hi",
  "hi",
  "hi",
  "hi Olivia",
  "hi Olivia",
  "hi Olivia needs",
  "hi Olivia needs to",
  "hi Olivia needs to go",
  "hi Olivia needs to go",
  "hi Olivia needs to go to",
  "hi Olivia needs to go to bed",
];
describe("recognition result reconciliation", () => {
  it("shows the latest sentence from the reported cumulative results", () => {
    expect(interimTranscript(revisions)).toBe("hi Olivia needs to go to bed");
    expect(finalTranscriptSegments(revisions)).toEqual([
      "hi Olivia needs to go to bed",
    ]);
  });
  it("joins separate provisional fragments with word boundaries", () => {
    expect(interimTranscript(["Olivia needs", "to go", "to bed"])).toBe(
      "Olivia needs to go to bed",
    );
  });
  it("removes overlapping provisional words", () => {
    expect(interimTranscript(["Olivia needs to", "to go to bed"])).toBe(
      "Olivia needs to go to bed",
    );
  });
  it("preserves genuinely repeated complete utterances", () => {
    expect(
      finalTranscriptSegments([
        "Hi",
        "Hi",
        "Olivia needs to go to bed",
        "Olivia needs to go to bed",
      ]),
    ).toEqual([
      "Hi",
      "Hi",
      "Olivia needs to go to bed",
      "Olivia needs to go to bed",
    ]);
  });
  it("preserves final sentence fragments and a new sentence after revisions", () => {
    expect(
      finalTranscriptSegments([
        ...revisions,
        "James needs",
        "to check the schedule",
      ]),
    ).toEqual([
      "hi Olivia needs to go to bed",
      "James needs",
      "to check the schedule",
    ]);
  });
});
