/** Validate an API image URL before handing it to next/image (https Pexels only). */
export function eventImage(src: string): string {
  try {
    const u = new URL(src);
    if (u.protocol !== "https:" || u.hostname !== "images.pexels.com") return "";
    return u.toString();
  } catch {
    return "";
  }
}
