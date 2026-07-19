// 현재 좌표(lat,lng)에서 가장 가까운 정류소들을 반환한다.
// 부산 API에는 좌표기반 검색이 없어, 전체 정류소 목록(busStopList)을 받아
// 서버에서 최근접을 계산한다. 전체 목록은 자주 바뀌지 않으므로 엣지에 캐시한다.
export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lng = parseFloat(url.searchParams.get("lng") || "");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 50);

  if (isNaN(lat) || isNaN(lng)) {
    return Response.json({ error: "lat, lng 파라미터가 필요합니다." }, { status: 400 });
  }

  const serviceKey = (env.BUSAN_BUS_API_KEY || "").trim();
  if (!serviceKey) {
    return Response.json({ error: "BUSAN_BUS_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  const getTag = (c: string, t: string) => {
    const m = c.match(new RegExp(`<${t}>\\s*([^<]*)\\s*<\\/${t}>`, "i"));
    return m ? m[1].trim() : "";
  };

  try {
    const api = new URL("https://apis.data.go.kr/6260000/BusanBIMS/busStopList");
    api.searchParams.set("serviceKey", serviceKey);
    api.searchParams.set("numOfRows", "30000");

    // 전체 정류소 목록을 엣지에 하루 캐시 (매 요청마다 8천여 건 재조회 방지)
    const init: any = {
      headers: { Accept: "*/*", "User-Agent": "Mozilla/5.0" },
      cf: { cacheTtl: 86400, cacheEverything: true },
    };
    const res = await fetch(api.toString(), init);
    const raw = await res.text();

    const resultCode = (raw.match(/<resultCode>\s*(.+?)\s*<\/resultCode>/i) ?? [])[1]?.trim();
    if (resultCode !== "00") {
      return Response.json({ stops: [] });
    }

    const R = 6371000, rad = Math.PI / 180;
    const items = [...raw.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

    const stops: any[] = [];
    for (const it of items) {
      const c = it[1];
      const y = parseFloat(getTag(c, "gpsy"));
      const x = parseFloat(getTag(c, "gpsx"));
      const name = getTag(c, "bstopnm") || getTag(c, "nodenm");
      if (isNaN(x) || isNaN(y) || !name) continue;

      const dLat = (y - lat) * rad, dLng = (x - lng) * rad;
      const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat * rad) * Math.cos(y * rad) * Math.sin(dLng / 2) ** 2;
      const dist = 2 * R * Math.asin(Math.sqrt(s));

      stops.push({
        stopId: getTag(c, "bstopid"),
        stopName: name,
        arsno: getTag(c, "arsno"),
        gpsX: String(x),
        gpsY: String(y),
        dist: Math.round(dist),
      });
    }

    stops.sort((a, b) => a.dist - b.dist);
    return Response.json({ stops: stops.slice(0, limit) });
  } catch (error: any) {
    return Response.json(
      { error: "주변 정류소 조회 실패", details: error?.message || "알 수 없는 오류" },
      { status: 500 }
    );
  }
}
