export type NoteLayout = "lines" | "bullets" | "paragraphs";
const listLine = /^(?:[-*•▪◦‣]\s+|\d+[.)]\s+)/;
export function formatNotes(text: string, layout: NoteLayout): string {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").split("\n")
    .map(line => line.replace(/[ \t]+/g, " ").trim());
  const clean = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (layout === "lines" || !clean) return clean;
  if (layout === "bullets") return clean.split("\n").map(line => !line ? "" : /^\d+[.)]\s+/.test(line) ? line : `- ${line.replace(/^[-*•▪◦‣]\s+/, "")}`).join("\n");
  return clean.split("\n\n").map(block => {
    const rows = block.split("\n");
    return rows.reduce((out, line, i) => out + (i ? listLine.test(line) || listLine.test(rows[i - 1]) ? "\n" : " " : "") + line, "");
  }).join("\n\n");
}
