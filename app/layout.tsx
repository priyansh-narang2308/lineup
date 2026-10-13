import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

const sans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  // optional: no late font swap repaint, so body text never re-triggers LCP.
  display: "optional",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  preload: false,
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://lineup-render72.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Lineup — your fest, without the clashes",
    template: "%s · Lineup",
  },
  description:
    "Plan a clash-free campus fest weekend. Browse 30 events, match them to your squad size, see every schedule overlap and registration deadline, and export your lineup to your calendar.",
  openGraph: {
    title: "Lineup — your fest, without the clashes",
    description: "27 overlapping events. One weekend that actually fits.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} antialiased`}
    >
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-accent"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
