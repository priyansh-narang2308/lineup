"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts children only once the box is within `rootMargin` of the viewport.
 * Used for event-card images: Chrome's native lazy-loading threshold is ~2,500px
 * on slow connections, which made every card image download on first load.
 * The parent reserves the aspect ratio, so this never shifts layout.
 */
export function WhenNear({ children, rootMargin = "400px" }: { children: ReactNode; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className="absolute inset-0">
      {near ? children : null}
    </div>
  );
}
