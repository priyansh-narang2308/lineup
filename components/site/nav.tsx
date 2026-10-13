import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "./logo";
import { LineupCount } from "@/components/lineup/lineup-count";
import { ButtonLink } from "@/components/ui/button";

const links = [
  { href: "/events", label: "Events" },
  { href: "/#how", label: "How it works" },
  { href: "/#closing", label: "Closing soon" },
];

export function Nav({ current }: { current?: "home" | "events" }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line-subtle bg-canvas/75 backdrop-blur-xl supports-backdrop-filter:bg-canvas/65">
      <nav
        aria-label="Primary"
        className="container-page flex h-16 items-center justify-between gap-4"
      >
        <Logo />
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={
                  current === "events" && l.href === "/events"
                    ? "page"
                    : undefined
                }
                className="rounded-full px-3.5 py-2 text-[14px] font-medium text-fg-2 transition-colors hover:text-fg aria-[current=page]:text-fg"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2.5">
          <LineupCount />
          {current !== "events" && (
            <span className="hidden sm:contents">
              <ButtonLink
                href="/events"
                size="sm"
                iconRight={<ArrowRight aria-hidden className="size-4" />}
              >
                Browse events
              </ButtonLink>
            </span>
          )}
        </div>
      </nav>
    </header>
  );
}
