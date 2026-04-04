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

    const stops = items
      .map((itemMatch) => {
        const c = itemMatch[1];
        // lat = gpsY(위도), lin = gpsX(경도)
        const lat = getTag(c, "lat") || getTag(c, "gpsy") || getTag(c, "gpsY");
        const lng = getTag(c, "lin") || getTag(c, "gpsx") || getTag(c, "gpsX");
        const seq = parseInt(getTag(c, "nodeno") || getTag(c, "stnno") || "0", 10);
        const name = getTag(c, "bstopnm") || getTag(c, "nodenm") || getTag(c, "nodeNm");
        const nodeId = getTag(c, "nodeid") || getTag(c, "nodeId");

        if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) return null;

        return { seq, name, nodeId, lat: parseFloat(lat), lng: parseFloat(lng) };
      })
      .filter(Boolean);

    // 순번 기준 정렬 후 중복 좌표 제거
    const sorted = (stops as NonNullable<(typeof stops)[number]>[])
      .sort((a, b) => a.seq - b.seq)
      .filter((s, i, arr) => i === 0 || s.lat !== arr[i - 1].lat || s.lng !== arr[i - 1].lng);

    return Response.json({ stops: sorted });
  } catch (error: any) {
    return Response.json({ error: "노선 정류장 조회 실패", details: error.message }, { status: 500 });
  }
}
