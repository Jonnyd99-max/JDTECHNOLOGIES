export function numberValue(value: string, positive = false): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) && (positive ? n > 0 : n >= 0) ? n : null;
}
export function periodAt(time: string, startHour = 7, now = new Date()) {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  // Calendar boundaries use local time. An operational period is always 24 hours,
  // including clock-change days; production hours follow the selected wall clock.
  const elapsed = ((hours * 60 + minutes - startHour * 60 + 1440) % 1440) / 60;
  const asOf = new Date(now);
  asOf.setHours(hours, minutes, 0, 0);
  return { elapsed, remaining: 24 - elapsed, asOf };
}
export function localTime(now = new Date()) {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
export function forecast(
  target: number,
  actual: number,
  elapsed: number,
  remaining: number,
  multiplier = 1,
) {
  if (
    ![target, actual, elapsed, remaining, multiplier].every(Number.isFinite) ||
    target <= 0 ||
    actual < 0 ||
    elapsed < 0 ||
    remaining < 0 ||
    multiplier < 0
  )
    return null;
  const currentPace = elapsed > 0 ? actual / elapsed : null;
  const futurePace = currentPace === null ? null : currentPace * multiplier;
  const finish = futurePace === null ? null : actual + futurePace * remaining;
  const required =
    remaining > 0 ? Math.max(0, target - actual) / remaining : null;
  const timeToTarget =
    actual >= target
      ? 0
      : futurePace && futurePace > 0
        ? (target - actual) / futurePace
        : null;
  const values = [
    currentPace,
    futurePace,
    finish,
    required,
    timeToTarget,
    finish === null ? null : (finish / target) * 100,
  ];
  if (values.some((value) => value !== null && !Number.isFinite(value)))
    return null;
  return {
    currentPace,
    futurePace,
    finish,
    required,
    percent: finish === null ? null : (finish / target) * 100,
    gap: finish === null ? null : finish - target,
    timeToTarget,
  };
}
export function completionTime(asOf: Date, hours: number) {
  // Match the fixed production clock. Calendar arithmetic rolls over midnight
  // and lets the device resolve nonexistent local times on DST transitions.
  const completion = new Date(asOf);
  completion.setMinutes(completion.getMinutes() + Math.ceil(hours * 60));
  return Number.isFinite(completion.getTime()) ? localTime(completion) : null;
}
export function status(percent: number) {
  return percent < 90
    ? "Behind"
    : percent < 100
      ? "Below Target"
      : percent <= 110
        ? "On / Above Target"
        : "Ahead";
}
export type PercentageMode = "attainment" | "change" | "of" | "difference";
export function percentage(mode: PercentageMode, a: number, b: number) {
  if (![a, b].every(Number.isFinite) || a < 0 || b < 0) return null;
  const result =
    mode === "attainment"
      ? b > 0
        ? (a / b) * 100
        : null
      : mode === "change"
        ? a > 0
          ? ((b - a) / a) * 100
          : null
        : mode === "of"
          ? (a / 100) * b
          : a > 0 || b > 0
            ? (Math.abs(a - b) / (a / 2 + b / 2)) * 100
            : null;
  return result !== null && Number.isFinite(result) ? result : null;
}
export function capacity(perTool: number, count: number, remaining: number) {
  const total = perTool * count,
    available = (total / 24) * remaining;
  return perTool > 0 &&
    Number.isInteger(count) &&
    count > 0 &&
    remaining >= 0 &&
    remaining <= 24 &&
    Number.isFinite(total) &&
    Number.isFinite(available)
    ? { total, available }
    : null;
}
export function requiredTools(target: number, perTool: number) {
  if (
    !Number.isFinite(target) ||
    target < 0 ||
    !Number.isFinite(perTool) ||
    perTool <= 0
  )
    return null;
  const count = Math.ceil(target / perTool);
  const total = count * perTool;
  if (!Number.isSafeInteger(count) || !Number.isFinite(total)) return null;
  return { count, total, spare: total - target };
}
