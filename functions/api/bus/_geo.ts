// 임시 진단용 — 좌표기반 주변 정류소 엔드포인트 탐색. 조사 후 삭제.
export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint") || "busStopList";
  const serviceKey = (env.BUSAN_BUS_API_KEY || "").trim();

  const api = new URL(`https://apis.data.go.kr/6260000/BusanBIMS/${endpoint}`);
  api.searchParams.set("serviceKey", serviceKey);
  for (const [k, v] of url.searchParams.entries()) {
    if (k === "endpoint") continue;
    api.searchParams.set(k, v);
  }

  const res = await fetch(api.toString(), { headers: { Accept: "*/*", "User-Agent": "Mozilla/5.0" } });
  const raw = await res.text();
  const getTag = (c: string, t: string) => {
    const m = c.match(new RegExp(`<${t}>\\s*([^<]*)\\s*<\\/${t}>`, "i"));
    return m ? m[1].trim() : "";
  };
  const items = [...raw.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  return Response.json({
    endpoint,
    query: Object.fromEntries([...url.searchParams.entries()].filter(([k]) => k !== "endpoint")),
    resultCode: (raw.match(/<resultCode>\s*(.+?)\s*<\/resultCode>/i) ?? [])[1] ?? "",
    resultMsg: (raw.match(/<resultMsg>\s*(.+?)\s*<\/resultMsg>/i) ?? [])[1] ?? "",
    itemCount: items.length,
    firstItemTags: items[0] ? [...items[0][1].matchAll(/<([a-zA-Z0-9_]+)>/g)].map((m) => m[1]) : [],
    items: items.slice(0, 12).map((it) => ({
      nm: getTag(it[1], "bstopnm") || getTag(it[1], "nodenm"),
      ars: getTag(it[1], "arsno"),
      id: getTag(it[1], "bstopid") || getTag(it[1], "nodeid"),
      x: getTag(it[1], "gpsx"),
      y: getTag(it[1], "gpsy"),
    })),
  });
}
