/** Normalise an API image URL and tag it with the aspect ratio we render at. */
export function eventImage(src: string, ar: "3:2" | "16:9" | "4:5" = "3:2"): string {
  try {
    const u = new URL(src);
    if (u.protocol !== "https:") return "";
    return `${u.origin}${u.pathname}#ar=${ar}`;
  } catch {
    return "";
  }
}
