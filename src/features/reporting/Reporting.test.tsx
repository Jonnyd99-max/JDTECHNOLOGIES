// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { ReportingScreen } from "./Reporting";
import { loadReports, sendReport } from "./reportStorage";
import { CapacityCalculator, PaceCalculator, PercentageCalculator, RequiredToolsCalculator } from "../data/DataTools";
import { LocalToolStorage } from "../../storage/ToolStorage";
import { DowntimeCalculator } from "../data/Downtime";

vi.mock("../../components/Orb", () => ({ Orb: () => <div aria-hidden="true">Orb</div> }));
vi.mock("../../services/clipboard", () => ({ copyText: vi.fn().mockResolvedValue(undefined) }));
afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function mount(element: React.ReactNode) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<MemoryRouter>{element}</MemoryRouter>));
  return { host, root, close: async () => { await act(async () => root.unmount()); host.remove(); } };
}
async function fill(host: HTMLElement, label: string, value: string) {
  const field = [...host.querySelectorAll("label")].find(item => item.textContent?.startsWith(label))!;
  const input = field.querySelector("input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
it("sends calculator figures into a branded report and keeps percentage excluded", async () => {
  const pace = await mount(<PaceCalculator />);
  try {
    const send = [...pace.host.querySelectorAll("button")].find(b => b.textContent === "Send to Reporting")!;
    expect(send.disabled).toBe(true);
    await fill(pace.host, "Target", "1000");
    await fill(pace.host, "Current actual", "500");
    await fill(pace.host, "As of time", "19:00");
    expect(send.disabled).toBe(false);
    await act(async () => send.click());
    expect(loadReports().pace).toMatchObject({ actual: 500, target: 1000, elapsed: 12, remaining: 12 });
  } finally { await pace.close(); }
  const report = await mount(<ReportingScreen />);
  try {
    expect(report.host.textContent).toContain("JD TECHNOLOGY");
    expect(report.host.textContent).toContain("Lumo");
    expect(report.host.querySelector("svg")?.getAttribute("aria-label")).toContain("100%");
    expect(report.host.querySelectorAll("article")).toHaveLength(1);
    const filter = [...report.host.querySelectorAll("button")].find(b => b.textContent === "Required Tools")!;
    await act(async () => filter.click());
    expect(report.host.querySelectorAll("article")).toHaveLength(0);
    expect(report.host.textContent).toContain("has not been sent yet");
  } finally { await report.close(); }
  const percentage = await mount(<PercentageCalculator />);
  try { expect(percentage.host.textContent).not.toContain("Send to Reporting"); } finally { await percentage.close(); }
});
it("sends selected capacity and required-tools results, including whole tool counts", async () => {
  new LocalToolStorage().save([{ id: "a", name: "Tool A", capacity24: 100 }]);
  for (const Component of [CapacityCalculator, RequiredToolsCalculator]) {
    const page = await mount(<Component />);
    try {
      const select = page.host.querySelector("select")!;
      await act(async () => { select.value = "a"; select.dispatchEvent(new Event("change", { bubbles: true })); });
      await fill(page.host, Component === CapacityCalculator ? "Number of tools" : "24-hour target", Component === CapacityCalculator ? "2" : "201");
      await act(async () => [...page.host.querySelectorAll("button")].find(b => b.textContent === "Send to Reporting")!.click());
    } finally { await page.close(); }
  }
  expect(loadReports().capacity).toMatchObject({ count: 2, tool: { name: "Tool A" } });
  expect(loadReports().required).toMatchObject({ target: 201 });
  const page = await mount(<ReportingScreen />);
  try {
    expect(page.host.querySelectorAll("article")).toHaveLength(2);
    expect(page.host.textContent).toContain("Tools required3");
    expect(page.host.querySelectorAll("table")).toHaveLength(2);
  } finally { await page.close(); }
});
it("shows a useful empty state without demo figures", async () => {
  const page = await mount(<ReportingScreen />);
  try { expect(page.host.textContent).toContain("dashboard starts with Data Tools"); expect(page.host.querySelectorAll("article")).toHaveLength(0); }
  finally { await page.close(); }
});
it("names downtime rows from saved groups, assumes full uptime and sends individual downtime", async () => {
  new LocalToolStorage().save([{ id: "h", name: "Hydrox", capacity24: 240 }, { id: "b", name: "Other", capacity24: 480 }]);
  const page = await mount(<DowntimeCalculator />);
  try {
    const select = page.host.querySelector("select")!;
    await act(async () => { select.value = "h"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    await fill(page.host, "Number of tools", "10");
    expect(page.host.textContent).toContain("Hydrox 10");
    expect(page.host.textContent).toContain("ADJUSTED 24-HOUR OUTPUT2,400");
    await fill(page.host, "Hydrox 1 ·", "30"); await fill(page.host, "Hydrox 2 ·", "90");
    expect(page.host.textContent).toContain("ADJUSTED 24-HOUR OUTPUT2,380");
    await fill(page.host, "Hydrox 1 ·", "1441");
    const send = [...page.host.querySelectorAll("button")].find(b => b.textContent === "Send to Reporting")!;
    expect(send.disabled).toBe(true);
    await fill(page.host, "Hydrox 1 ·", "30");
    await act(async () => send.click());
    expect(loadReports().downtime).toMatchObject({ minutes: [30, 90, 0, 0, 0, 0, 0, 0, 0, 0], target: null, tool: { name: "Hydrox" } });
    await fill(page.host, "Number of tools", "2");
    expect(page.host.textContent).toContain("ADJUSTED 24-HOUR OUTPUT460");
    await act(async () => { select.value = "b"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(page.host.textContent).toContain("Other 2");
    expect(page.host.textContent).toContain("ADJUSTED 24-HOUR OUTPUT960");
  } finally { await page.close(); }
  const report = await mount(<ReportingScreen />);
  try { expect(report.host.textContent).toContain("Hydrox 10"); expect(report.host.textContent).toContain("2,380"); }
  finally { await report.close(); }
});
it("downloads a named PDF without invoking print and provides open/download links", async () => {
  sendReport({ group: "required", target: 1000, tool: { id: "a", name: "Example Tool", capacity24: 240 } });
  vi.stubGlobal("URL", class extends URL { static createObjectURL = vi.fn(() => "blob:report"); static revokeObjectURL = vi.fn(); });
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const page = await mount(<ReportingScreen />);
  try {
    await act(async () => {
      [...page.host.querySelectorAll("button")].find(b => b.textContent === "Download PDF")!.click();
      await import("./reportPdf");
    });
    expect(print).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
    expect(page.host.textContent).toContain("JD-Technology-required-report-");
    expect(page.host.querySelector('a[download]')?.getAttribute("href")).toBe("blob:report");
    expect(page.host.querySelector('a[target="_blank"]')?.textContent).toBe("Open PDF");
  } finally { await page.close(); }
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:report");
});
