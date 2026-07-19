export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const lineId = url.searchParams.get("lineId");

  if (!lineId) {
    return Response.json({ error: "lineId가 필요합니다." }, { status: 400 });
  }

  const serviceKey = (env.BUSAN_BUS_API_KEY || "").trim();
  if (!serviceKey) {
    return Response.json({ error: "BUSAN_BUS_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  const getTag = (content: string, tag: string) => {
    const match = content.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`, "i"));
    return match ? match[1].trim() : "";
  };

  try {
    const apiUrl = new URL("https://apis.data.go.kr/6260000/BusanBIMS/busInfoByRouteId");
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("lineid", lineId);

    const response = await fetch(apiUrl.toString(), {
      headers: { Accept: "*/*", "User-Agent": "Mozilla/5.0" },
    });
    const rawData = await response.text();

    const resultCodeMatch = rawData.match(/<resultCode>\s*(.+?)\s*<\/resultCode>/i);
    const resultCode = resultCodeMatch ? resultCodeMatch[1].trim() : "";

    if (resultCode !== "00") {
      return Response.json({ stops: [] });
    }

    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = [...rawData.matchAll(itemRegex)];

    // busInfoByRouteId 는 노선의 전체 경유 정류소를 bstopidx 순서로 반환한다.
    // 좌표(gps)와 carno 는 현재 버스가 있는 정류소에만 채워진다.
    // → 좌표 유무로 거르지 말고 전체 정류소를 순서대로 반환한다.
    const stops = items
      .map((itemMatch, i) => {
        const c = itemMatch[1];
        const latRaw = getTag(c, "lat") || getTag(c, "gpsy") || getTag(c, "gpsY");
        const lngRaw = getTag(c, "lin") || getTag(c, "gpsx") || getTag(c, "gpsX");
        const idx = parseInt(
          getTag(c, "bstopidx") || getTag(c, "nodeord") || getTag(c, "nodeno") || getTag(c, "stnno") || "0",
          10
        );
        const name = getTag(c, "bstopnm") || getTag(c, "nodenm") || getTag(c, "nodeNm");
        const nodeId = getTag(c, "nodeid") || getTag(c, "nodeId");
        const bstopid = getTag(c, "bstopid");
        const arsno = getTag(c, "arsno");
        const bus = getTag(c, "carno"); // 이 정류소에 현재 위치한 버스 차량번호
        const rpoint = getTag(c, "rpoint"); // 회차지 등 구분

        if (!name) return null;

        const latN = parseFloat(latRaw);
        const lngN = parseFloat(lngRaw);
        const hasCoord = latRaw && lngRaw && !isNaN(latN) && !isNaN(lngN);

        return {
          seq: isNaN(idx) ? i : idx,
          name,
          nodeId,
          bstopid,
          arsno,
          bus: bus || undefined,
          rpoint: rpoint || undefined,
          ...(hasCoord ? { lat: latN, lng: lngN } : {}),
        };
      })
      .filter(Boolean) as NonNullable<any>[];

    // bstopidx(순번) 기준 정렬
    stops.sort((a, b) => a.seq - b.seq);

    return Response.json({ stops });
  } catch (error: any) {
    return Response.json({ error: "노선 정류장 조회 실패", details: error.message }, { status: 500 });
  }
}
