
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const recitationId = searchParams.get("recitationId");   // numeric
  const chapterNumber = searchParams.get("chapterNumber"); // 1..114

  if (!recitationId || !chapterNumber) {
    return NextResponse.json(
      { error: "Missing recitationId or chapterNumber" },
      { status: 400 }
    );
  }

  // Quran.com API endpoint (stable):
  // GET /api/v4/chapter_recitations/{reciter_id}/{chapter_number}?segments=true
  const upstream = `https://api.quran.com/api/v4/chapter_recitations/${encodeURIComponent(
    recitationId
  )}/${encodeURIComponent(chapterNumber)}?segments=true`;

  const res = await fetch(upstream, {
    // Cache a bit so you don't hammer the upstream on every render
    next: { revalidate: 60 * 60 }, // 1 hour
  });

  const text = await res.text();

  // Pass through upstream errors (helps debugging)
  if (!res.ok) {
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  }

  return new NextResponse(text, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
