// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import { LocalToolStorage, validateTool } from "./ToolStorage";
beforeEach(() => localStorage.clear());
it("persists tool edits and deletions between storage instances", () => {
  const storage = new LocalToolStorage();
  expect(storage.load()).toEqual([]);
  storage.save([{ id: "1", name: "Test tool", capacity24: 500 }]);
  expect(new LocalToolStorage().load()[0].capacity24).toBe(500);
  storage.save([{ id: "1", name: "Test tool", capacity24: 600 }]);
  expect(new LocalToolStorage().load()[0].capacity24).toBe(600);
  storage.save([]);
  expect(storage.load()).toEqual([]);
});
it("validates names and capacities and preserves unreadable stored data", () => {
  const tools = [{ id: "1", name: "Test", capacity24: 500 }];
  expect(validateTool(" test ", 100, tools)).toContain("already exists");
  expect(validateTool("Test", 100, tools, "1")).toBe("");
  expect(validateTool(" ", 100, tools)).toContain("name");
  expect(validateTool("Other", 0, tools)).toContain("greater than zero");
  localStorage.setItem("jd.tools.v1", "invalid");
  expect(() => new LocalToolStorage().load()).toThrow();
  expect(localStorage.getItem("jd.tools.v1")).toBe("invalid");
});
