// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { OnlineHandwriting } from "./OnlineHandwriting";
import { prepareOnlinePhoto, readOnlinePhoto } from "./onlineOcr";

vi.mock("./onlineOcr", () => ({ prepareOnlinePhoto: vi.fn(), readOnlinePhoto: vi.fn() }));
vi.mock("../../services/clipboard", () => ({ copyText: vi.fn() }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("requires a key, consent and an explicit click, then aborts on navigation", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() });
  vi.mocked(prepareOnlinePhoto).mockResolvedValue(new Blob(["photo"], { type: "image/jpeg" }));
  vi.mocked(readOnlinePhoto).mockImplementation(() => new Promise(() => {}));
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<OnlineHandwriting image="local-photo" />));
    const button = [...host.querySelectorAll("button")].find(item => item.textContent === "Read online")!;
    expect(button.disabled).toBe(true);
    expect(readOnlinePhoto).not.toHaveBeenCalled();
    const input = host.querySelector<HTMLInputElement>('input[type="password"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "test-key");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(button.disabled).toBe(true);
    await act(async () => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    expect(button.disabled).toBe(false);
    expect(readOnlinePhoto).not.toHaveBeenCalled();
    await act(async () => button.click());
    expect(readOnlinePhoto).toHaveBeenCalledTimes(1);
    const signal = vi.mocked(readOnlinePhoto).mock.calls[0][2];
    await act(async () => root.unmount());
    expect(signal.aborted).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  } finally { if (host.childNodes.length) await act(async () => root.unmount()); host.remove(); }
});
