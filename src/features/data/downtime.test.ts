import { expect, it } from "vitest";
import { downtimeImpact } from "./calculations";
it("defaults all tools to full capacity and totals different overlapping downtime", () => {
  expect(downtimeImpact(240, Array(10).fill(0))).toMatchObject({ total: 2400, output: 2400, lost: 0, uptime: 100 });
  const result = downtimeImpact(240, [30, 90, 0])!;
  expect(result).toMatchObject({ total: 720, lost: 20, output: 700, minutes: 120 });
  expect(result.rows.map(row => row.output)).toEqual([235, 225, 240]);
  expect(downtimeImpact(240, [1440])).toMatchObject({ output: 0, lost: 240, uptime: 0 });
});
it("rejects invalid periods and capacity without inventing output", () => {
  for (const values of [[], [-1], [1441], [NaN], [Infinity], Array(1001).fill(0)]) expect(downtimeImpact(240, values)).toBeNull();
  expect(downtimeImpact(0, [0])).toBeNull();
  expect(downtimeImpact(Number.MAX_VALUE, [0, 0])).toBeNull();
});
