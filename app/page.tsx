import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { Hero } from "@/components/landing/hero";
import {
  ByDay,
  ClosingSoon,
  Featured,
  FinalCta,
  HowItWorks,
  Problem,
} from "@/components/landing/sections";
import { tryGetEvents } from "@/lib/events/server";

export default async function Home() {
  const data = await tryGetEvents();
  const active =
    data?.events.filter((e) => e.event_status === "ACTIVE").length ?? 0;

  return (
    <>
      <Nav current="home" />
      <main id="main">
        <Hero data={data} />
        {data && <Problem data={data} />}
        <HowItWorks />
        {data && <Featured data={data} />}
        {data && <ClosingSoon data={data} now={data.fetchedAt} />}
        {data && <ByDay data={data} />}
        <FinalCta count={active} />
      </main>
      <Footer />
    </>
  );
}
