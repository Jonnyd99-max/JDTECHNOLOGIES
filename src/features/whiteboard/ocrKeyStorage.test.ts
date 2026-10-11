// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { loadOcrKey, saveOcrKey } from "./ocrKeyStorage";
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
it("loads a personal key after a new visit and removes it on request", () => {
  expect(loadOcrKey().key).toBe("");
  saveOcrKey(" personal-key ");
  expect(loadOcrKey()).toEqual({ key: "personal-key", message: "" });
  saveOcrKey("");
  expect(loadOcrKey().key).toBe("");
});
it("handles inaccessible storage without exposing key values", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(loadOcrKey().key).toBe("");
  expect(loadOcrKey().message).toContain("unavailable");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(() => saveOcrKey("personal-key")).toThrow("blocked");
});
