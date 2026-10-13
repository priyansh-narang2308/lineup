"use client";

/**
 * next/image loader for event photography.
 * Event images are hosted on Pexels, which resizes and transcodes on its CDN
 * (1-year immutable cache). We request the exact width the browser needs as
 * WebP, so we pay no image-optimisation cost and serve ~20 KB card covers.
 *
 * Aspect ratio is passed via a `#ar=3:2` fragment on src (stripped here).
 */
export default function pexelsLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (url.hostname !== "images.pexels.com") return src;
  const ar = /ar=(\d+):(\d+)/.exec(url.hash);
  const [aw, ah] = ar ? [Number(ar[1]), Number(ar[2])] : [3, 2];
  const base = `${url.origin}${url.pathname}`;
  const h = Math.round((width * ah) / aw);
  const q = quality ?? 70;
  return `${base}?auto=compress&cs=tinysrgb&fit=crop&w=${width}&h=${h}&fm=webp&q=${q}`;
}
