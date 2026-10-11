const STORAGE_KEY = "jd.ocr-space-key.v1";

export function loadOcrKey(): { key: string; message: string } {
  try { return { key: localStorage.getItem(STORAGE_KEY)?.trim() || "", message: "" }; }
  catch { return { key: "", message: "Device storage is unavailable. You can still enter a key for this visit." }; }
}

export function saveOcrKey(key: string): void {
  if (key.trim()) localStorage.setItem(STORAGE_KEY, key.trim());
  else localStorage.removeItem(STORAGE_KEY);
}
