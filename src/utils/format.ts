import type { Action, Meeting } from "../models";
export function duration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
export function meetingSeconds(m: Meeting): number {
  return (
    (new Date(m.endedAt || Date.now()).getTime() -
      new Date(m.startedAt).getTime()) /
    1000
  );
}
export function dateLabel(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export function timeLabel(date: string): string {
  return new Date(date).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function formatActions(actions: Action[]): string {
  return (
    "Meeting Actions\n\n" +
    (actions.length
      ? actions
          .map(
            (a) =>
              `${a.owner}\n- ${a.description}${a.dueDate ? ` (Due: ${a.dueDate})` : ""}${a.status === "complete" ? " [Complete]" : ""}`,
          )
          .join("\n\n")
      : "No actions captured.")
  );
}
export function formatSummary(m: Meeting): string {
  return `${m.name}\n${dateLabel(m.startedAt)} at ${timeLabel(m.startedAt)}\nDuration: ${duration(meetingSeconds(m))}\n\n${formatActions(m.actions)}`;
}
