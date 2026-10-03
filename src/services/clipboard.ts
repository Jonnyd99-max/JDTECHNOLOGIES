import { Capacitor } from "@capacitor/core";
import { Clipboard } from "@capacitor/clipboard";
export async function copyText(text: string): Promise<void> {
  if (Capacitor.isNativePlatform()) await Clipboard.write({ string: text });
  else {
    if (!navigator.clipboard)
      throw new Error("Clipboard unavailable. Open this app over HTTPS.");
    await navigator.clipboard.writeText(text);
  }
}
