import { expect, it } from "vitest";
import { formatNotes } from "./formatNotes";
it("tidies spacing without correcting technical text or merging separate notes", () => {
  expect(formatNotes("  Tool  error state - AI/XML\r\n\r\n\r\nPush\tlots. \n22 / 9 / 2015", "lines")).toBe("Tool error state - AI/XML\n\nPush lots.\n22 / 9 / 2015");
});
it("creates consistent bullets and preserves numbered items and section breaks", () => {
  expect(formatNotes("• Push lots\n- Green to green\n\n1. Strip data\nAI/XML", "bullets")).toBe("- Push lots\n- Green to green\n\n1. Strip data\n- AI/XML");
});
it("joins wrapped paragraphs but keeps explicit lists and blank line boundaries", () => {
  expect(formatNotes("Please check\nthe tool.\n\n- Push lots\n- Strip data", "paragraphs")).toBe("Please check the tool.\n\n- Push lots\n- Strip data");
  expect(formatNotes("  \n ", "bullets")).toBe("");
});
