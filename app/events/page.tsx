import type { Metadata } from "next";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { EventsExplorer } from "@/components/events/explorer";
import { tryGetEvents } from "@/lib/events/server";
import { MotionProvider } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Browse every campus fest event, filter by day, squad size and price, and build a clash-free lineup.",
};

export default async function EventsPage() {
  const initial = await tryGetEvents();
  return (
    <>
      <Nav current="events" />
      <main id="main">
        <MotionProvider>
          <EventsExplorer initial={initial} />
        </MotionProvider>
      </main>
      <Footer />
    </>
  );
}
