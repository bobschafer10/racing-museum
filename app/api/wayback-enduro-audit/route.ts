import { NextRequest, NextResponse } from "next/server";

const TARGET = "http://www.racingonline.com/enduro/standing.html";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== "umarm-1996-2000-enduro") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ts = req.nextUrl.searchParams.get("ts");
  try {
    if (ts) {
      if (!/^\d{14}$/.test(ts)) {
        return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });
      }
      const snapshotUrl = `https://web.archive.org/web/${ts}id_/${TARGET}`;
      const r = await fetch(snapshotUrl, {
        cache: "no-store",
        headers: { "User-Agent": "UMARM historical research" },
      });
      const html = await r.text();
      return new NextResponse(html, {
        status: r.status,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const cdx = new URL("https://web.archive.org/cdx/search/cdx");
    cdx.searchParams.set("url", TARGET);
    cdx.searchParams.set("from", "1996");
    cdx.searchParams.set("to", "2001");
    cdx.searchParams.set("output", "json");
    cdx.searchParams.append("filter", "statuscode:200");
    cdx.searchParams.set("fl", "timestamp,original,statuscode,mimetype,digest");
    cdx.searchParams.set("collapse", "digest");

    const r = await fetch(cdx, {
      cache: "no-store",
      headers: { "User-Agent": "UMARM historical research" },
    });
    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
