export interface CapacityTool {
  id: string;
  name: string;
  capacity24: number;
}
export interface ToolStorage {
  load(): CapacityTool[];
  save(tools: CapacityTool[]): void;
}
export function validateTool(
  name: string,
  capacity: number,
  tools: CapacityTool[],
  id?: string,
) {
  if (!name.trim()) return "Enter a tool name.";
  if (!Number.isFinite(capacity) || capacity <= 0)
    return "Enter a capacity greater than zero.";
  if (
    tools.some(
      (tool) =>
        tool.id !== id &&
        tool.name.trim().toLocaleLowerCase() ===
          name.trim().toLocaleLowerCase(),
    )
  )
    return "A tool with this name already exists.";
  return "";
}
export class LocalToolStorage implements ToolStorage {
  constructor(private storage: Storage = localStorage) {}
  load(): CapacityTool[] {
    const raw = this.storage.getItem("jd.tools.v1");
    if (!raw) return [];
    const tools: unknown = JSON.parse(raw);
    if (
      !Array.isArray(tools) ||
      !tools.every(
        (t) =>
          t &&
          typeof t.id === "string" &&
          t.id &&
          typeof t.name === "string" &&
          t.name.trim() &&
          typeof t.capacity24 === "number" &&
          Number.isFinite(t.capacity24) &&
          t.capacity24 > 0,
      ) ||
      new Set(tools.map((t) => t.id)).size !== tools.length ||
      new Set(tools.map((t) => t.name.trim().toLocaleLowerCase())).size !==
        tools.length
    )
      throw new Error(
        "Stored tools could not be read. Existing data has been preserved.",
      );
    return tools;
  }
  save(tools: CapacityTool[]) {
    this.storage.setItem("jd.tools.v1", JSON.stringify(tools));
  }
}
