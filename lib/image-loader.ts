"use client";

export default function pexelsLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
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
