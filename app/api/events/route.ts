import { connection } from "next/server";
import { getEvents, upstreamCode } from "@/lib/events/server";

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
    await connection();
    const code = upstreamCode(err);
    return Response.json(
      {
        error: code ?? "upstream_unavailable",
        message: "The events service is unavailable right now.",
      },
      {
        status: code === "timeout" ? 504 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
