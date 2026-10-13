import { getEventDetail, UpstreamError, UUID_RE } from "@/lib/events/server";

/** GET /api/events/:id — full event detail, validated, CDN-cached. */
export async function GET(_req: Request, ctx: RouteContext<"/api/events/[id]">) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return Response.json(
      { error: "invalid_id", message: "Event ids are UUIDs." },
      { status: 400, headers: { "Cache-Control": "public, s-maxage=86400" } },
    );
  }
  try {
    const event = await getEventDetail(id);
    return Response.json(
      { event },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    const e = err instanceof UpstreamError ? err : null;
    if (e?.code === "not_found") {
      return Response.json(
        { error: "not_found", message: "Event not found." },
        { status: 404, headers: { "Cache-Control": "public, s-maxage=60" } },
      );
    }
    return Response.json(
      { error: e?.code ?? "upstream_unavailable", message: "The events service is unavailable right now." },
      { status: e?.code === "timeout" ? 504 : 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
