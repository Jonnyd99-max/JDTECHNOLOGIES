export const ONLINE_IMAGE_LIMIT = 900_000;

export async function prepareOnlinePhoto(source: string): Promise<Blob> {
  const image = new Image();
  image.src = source;
  await image.decode();
  // Keep resolution first; reduce JPEG quality before reducing dimensions.
  let scale = Math.min(1, 3000 / Math.max(image.naturalWidth, image.naturalHeight));
  for (let attempt = 0; attempt < 8; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare this photo.");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [.92, .84, .74, .64]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= ONLINE_IMAGE_LIMIT) return blob;
    }
    scale *= .8;
  }
  throw new Error("Could not fit this photo within the free limit. Crop closer to the writing.");
}

export function parseOnlineReading(value: unknown): string {
  if (!value || typeof value !== "object") throw new Error("OCR.space returned an unexpected response. Try again later.");
  const result = value as { IsErroredOnProcessing?: boolean; OCRExitCode?: number; ParsedResults?: { FileParseExitCode?: number; ParsedText?: unknown }[] };
  if (result.IsErroredOnProcessing || result.OCRExitCode !== 1 || !Array.isArray(result.ParsedResults)
      || result.ParsedResults.some(page => page.FileParseExitCode !== 1)) {
    // Never display raw provider errors: they may echo credentials or submitted content.
    throw new Error("OCR.space could not read this photo. Check your free key and allowance, or crop closer and try again. No automatic retry was sent.");
  }
  return result.ParsedResults.map(page => typeof page.ParsedText === "string" ? page.ParsedText.trim() : "").filter(Boolean).join("\n\n");
}

export async function readOnlinePhoto(photo: Blob, key: string, signal: AbortSignal): Promise<string> {
  if (!key.trim()) throw new Error("Enter your free OCR.space key first.");
  if (photo.size > ONLINE_IMAGE_LIMIT || photo.type !== "image/jpeg") throw new Error("Prepare a JPEG below the free image limit first.");
  const body = new FormData();
  body.append("file", photo, "lumo-photo.jpg");
  body.append("OCREngine", "3");
  body.append("language", "eng");
  body.append("isOverlayRequired", "false");
  body.append("isCreateSearchablePdf", "false");
  body.append("detectOrientation", "true");
  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST", body, headers: { apikey: key.trim() }, signal,
    credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error(response.status === 429
    ? "The free request limit has been reached. Wait before trying again; the offline reader is still available."
    : "OCR.space is unavailable or rejected the request. Check your key and try later.");
  return parseOnlineReading(await response.json());
}
