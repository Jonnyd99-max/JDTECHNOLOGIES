// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { PhotoTextReader } from "./PhotoTextReader";
vi.mock("./OnlineHandwriting", () => ({ OnlineHandwriting: () => <p>Online reader active</p> }));
vi.mock("./TextExtraction", () => ({ TextExtraction: () => <p>Printed reader active</p> }));
it("defaults to online and mounts only the selected reader", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<PhotoTextReader image="cleaned" original="original" />));
    expect(host.textContent).toContain("Online reader active");
    expect(host.textContent).not.toContain("Printed reader active");
    await act(async () => host.querySelectorAll("button")[1].click());
    expect(host.textContent).toContain("Printed reader active");
    expect(host.textContent).not.toContain("Online reader active");
    expect(host.querySelectorAll("button")[1].getAttribute("aria-pressed")).toBe("true");
  } finally { await act(async () => root.unmount()); vi.unstubAllGlobals(); }
});
