# Lineup — your fest, without the clashes

A campus events platform built for **Render72**. Lineup turns a weekend of overlapping events into a plan that actually fits: browse every event, match them to your squad size, see real schedule clashes and registration deadlines, and export a clash-free lineup to your calendar.

**Pages:** `/` (landing) and `/events` (discovery, event detail drawer, personal lineup).
**Data:** the official Render72 Events API — `GET /api/test/events` and `GET /api/test/events/{id}`. Nothing is hard-coded or invented.

## Why it exists

The API describes a three-day campus fest. Across its 27 active events, **113 pairs overlap**, **10 events run at once** on Saturday at 11:00, registration closes on **8 different dates**, and team rules range from solo-only to crews of ten. Every one of those figures is computed live from the API on the landing page.

## Features

- **Clash-aware lineup** — add events and every overlapping event is flagged with the exact overlap, computed from *real sessions* (the overnight hackathon and the three-day film sprint included).
- **Squad size** — "Going as Solo / 2 / 3 / 4 / 5+" hides events your squad can't enter and turns per-team fees into what each person pays.
- **Cards and timeline views** — a day timeline on desktop, a vertical agenda on mobile.
- **Search, day filter, technical/cultural, free, open-for-registration, online, four sort orders** — all synced to the URL, so every view is shareable.
- **Event detail drawer** — deep-linkable (`/events?e=<id>`), Back closes it, renders list data instantly while full detail loads.
- **Lineup panel** — conflicts to resolve, sessions by day, deadlines ordered by urgency, estimated cost per person, `.ics` calendar export, and share links (`/events?lineup=…`) that are offered, never forced, on the receiving side.
- **No account** — the lineup lives in `localStorage`, synced across tabs.

## Architecture

```
app/
  page.tsx                 landing (server component, prerendered, 5-min revalidation)
  events/page.tsx          events page (prerendered snapshot + client explorer)
  api/events/route.ts      same-origin proxy: validated, session-enriched list
  api/events/[id]/route.ts same-origin proxy: validated detail, 400/404/502/504
components/
  landing/                 hero timeline preview, data-driven sections
  events/                  explorer, filters, cards, timeline, drawer, states
  lineup/                  toggle, panel, nav count
lib/
  events/schema.ts         Zod (mini) runtime contracts, tolerant item-level parsing
  events/server.ts         cached upstream fetch ("use cache", 5 min), timeout + retry
  events/client.ts         browser data layer: timeout, bounded retry, dedupe, classification
  events/clash.ts          overlap math across real sessions, lane packing
  events/derive.ts         availability, squad eligibility, per-person pricing
  events/filter.ts         search, filters, sorting, URL <-> state
  lineup/                  persisted store, share links, ICS builder
```

**Stack:** Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS v4, Radix Dialog (shadcn-style sheet), Lucide icons, Zod Mini, Vitest, Playwright. Deployed on Vercel.

### Data flow and caching (built for 5–10k visitors/day)

1. The server fetches the list once per **5-minute** revalidation window. Only multi-day events also need their detail, to get real sessions — today that's **2 extra requests**, never one per visitor.
2. Both pages are **prerendered** with that snapshot, so the first paint already contains real data.
3. In the browser, `/events` revalidates once through our **same-origin proxy** (`/api/events`), served from the CDN with `s-maxage=300, stale-while-revalidate=86400`. A traffic spike hits our edge cache, not the organisers' API.
4. Event detail is fetched lazily when the drawer opens (prefetched on hover/focus intent) and cached in memory.
5. Images are served same-origin through the Next image optimiser — AVIF/WebP at the exact rendered width, long-lived cache, and no third-party cookies from the image host.

## Reliability

| Situation | What the user sees |
|---|---|
| Refresh fails but a snapshot exists | Data stays usable; a "Live update failed — showing the schedule loaded N min ago · Retry" banner |
| No data and the service errors | A specific error panel with **Try again** |
| Timeout (8 s per attempt) | Bounded retries (2, exponential backoff + jitter), then a timeout panel |
| Offline | Offline panel; automatic retry when the connection returns |
| Empty dataset | An honest "No events published yet" state |
| Filters match nothing | "No events match" with a one-click **Clear filters** |
| Malformed / non-JSON response | Rejected — nothing unverified is rendered |
| One malformed record | That record is dropped and counted; the rest render |
| Invalid / unknown event id | 400/404 from our proxy; "That event doesn't exist" in the drawer |
| Detail fails to load | The drawer keeps the summary and offers retry |

Requests are cancelled on unmount, deduplicated while in flight, and retried only for transient failures (network, timeout, 5xx, 429).

**Data quirk handled:** six events return prizes with `rank: null` (special awards). These are rendered as "Special award" rather than failing validation.

### Reliability lab

Append `?simulate=` to `/events` to see each state without touching the real API:
`error`, `timeout`, `offline`, `empty`, `malformed`, `slow`, `notfound` — for example `/events?simulate=timeout`. Simulation runs only in the browser data layer.

## Accessibility

Semantic landmarks and headings, skip link, visible focus rings, focus-trapped dialogs with Escape and Back support, labelled controls (`radiogroup`s for day / squad / view), `aria-live` result announcements, AA colour contrast, `prefers-reduced-motion` respected, touch targets of at least 32–44 px.

## Performance

Measured with **Lighthouse 12.8, local production build** (`next start`), default mobile and desktop presets:

| Page | Mobile perf | Desktop perf | Accessibility | Best practices | SEO |
|---|---|---|---|---|---|
| `/` | 96–97 | 100 | 100 | 100 | 100 |
| `/events` | 91–93 | 100 | 100 | 100 | 100 |

These are local lab numbers; scores on the deployed site are tracked separately with PageSpeed Insights.

What keeps it fast: server components for everything static, no client-side data fetch on the landing page, the hero "product preview" is pure HTML/CSS (no images, no JS), two subset fonts with metric-matched fallbacks (body font uses `display: optional` to avoid late reflow), a single preloaded LCP image on `/events`, lazy images elsewhere, and `content-visibility` on long lists.

## Running locally

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm build && pnpm start
```

## Tests

```bash
pnpm test           # Vitest: clash math, overnight sessions, pricing, filters, schema resilience, ICS (24 tests)
pnpm build && pnpm test:e2e   # Playwright: user flows, every failure state, no horizontal overflow at 320–1440 px (35 tests)
```

End-to-end failure tests intercept requests to **our own** proxy or use the reliability lab; the organisers' API is never load-tested.

## Design

Dark, image-led interface with a restrained lime accent reserved for "your lineup" and primary actions, red only for real clashes, amber only for deadlines. Display type is Bricolage Grotesque, UI type is Geist, times and numbers use Geist Mono. The design system (tokens, components, desktop landing page) is in Figma: *Lineup — Render72 | Product Design*.

## AI assistance

Parts of this project were built with the help of an AI coding assistant. All product decisions, review and the final submission are the author's.
