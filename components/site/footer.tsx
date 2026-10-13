import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="border-t border-line-subtle">
      <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="text-[13px] text-fg-3">
            Event data from the Render72 Events API · All times IST · No account needed
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium text-fg-2">
          <li><Link className="hover:text-fg" href="/events">Events</Link></li>
          <li><Link className="hover:text-fg" href="/#closing">Closing soon</Link></li>
          <li><Link className="hover:text-fg" href="/events?simulate=error">Reliability lab</Link></li>
          <li className="text-fg-3">Built for Render72 · 2026</li>
        </ul>
      </div>
    </footer>
  );
}
