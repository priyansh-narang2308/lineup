import { connection } from "next/server";
import { getEvents, UpstreamError } from "@/lib/events/server";

/**
 * GET /api/events — validated, session-enriched list.
 * Served from the CDN; the cached loader revalidates every 5 minutes and keeps
 * serving the last good copy if the organisers' API is briefly down.
 */
export async function GET() {
  try {
    const payload = await getEvents();
    return Response.json(payload, {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    // Never prerender a failure: opt this response into request time.
    await connection();
    const e = err instanceof UpstreamError ? err : null;
    return Response.json(
      {
        error: e?.code ?? "upstream_unavailable",
        message: "The events service is unavailable right now.",
      },
      {
        status: e?.code === "timeout" ? 504 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
