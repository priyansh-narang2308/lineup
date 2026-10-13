import Link from "next/link";

export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="0" y="4" width="14" height="4" rx="2" fill="var(--color-fg)" />
      <rect x="5" y="10" width="19" height="4" rx="2" fill="var(--color-accent)" />
      <rect x="10" y="16" width="9" height="4" rx="2" fill="var(--color-fg)" opacity="0.55" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5 rounded-lg" aria-label="Lineup home">
      <LogoMark className="size-6 transition-transform duration-300 ease-[var(--ease-out)] group-hover:-rotate-6" />
      <span className="font-display text-[22px] leading-none font-semibold tracking-[-0.03em]">Lineup</span>
    </Link>
  );
}
