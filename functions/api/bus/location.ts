export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const lineId = url.searchParams.get("lineId");

  if (!lineId) {
    return Response.json({ error: "노선 ID가 필요합니다." }, { status: 400 });
  }

  const serviceKey = (env.BUSAN_BUS_API_KEY || "").trim();
  
  if (!serviceKey) {
    return Response.json(
      { error: "BUSAN_BUS_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    // ✅ 1차 시도: getBusLocationList (실시간 위치 전용)
    const apiUrl = new URL("https://apis.data.go.kr/6260000/BusanBIMS/getBusLocationList");
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("lineid", lineId);

    const response = await fetch(apiUrl.toString());
    const rawData = await response.text();

    const getTag = (content: string, tag: string) => {
      const match = content.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`, "i"));
      return match ? match[1].trim() : "";
    };

    const resultCodeMatch = rawData.match(/<resultCode>\s*(.+?)\s*<\/resultCode>/i);
    const resultCode = resultCodeMatch ? resultCodeMatch[1].trim() : "";

    let locations: any[] = [];

    if (resultCode === "00") {
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      const items = [...rawData.matchAll(itemRegex)];
      
      locations = items.map((itemMatch) => {
        const itemContent = itemMatch[1];
        const gpsX = getTag(itemContent, "gpsX") || getTag(itemContent, "lin");
        const gpsY = getTag(itemContent, "gpsY") || getTag(itemContent, "lat");
        const vehId = getTag(itemContent, "vehId") || getTag(itemContent, "carno");
        const plateNo = getTag(itemContent, "plateNo") || getTag(itemContent, "carno");
        const nodeId = getTag(itemContent, "nodeId") || getTag(itemContent, "nodeid");
        const nodeNm = getTag(itemContent, "nodeNm") || getTag(itemContent, "bstopnm");

        if (!gpsX || !gpsY) return null;

        return {
          vehId: vehId || `${lineId}-${nodeId}-${plateNo}`,
          lineId,
          nodeId,
          nodeNm,
          gpsX,
          gpsY,
          plateNo,
        };
      }).filter(Boolean);
    }

    // ✅ 2차 시도: busInfoByRouteId (결과가 없거나 1차 실패 시)
    if (locations.length === 0) {
      const fallbackUrl = new URL("https://apis.data.go.kr/6260000/BusanBIMS/busInfoByRouteId");
      fallbackUrl.searchParams.set("serviceKey", serviceKey);
      fallbackUrl.searchParams.set("lineid", lineId);

      const fbResponse = await fetch(fallbackUrl.toString());
      const fbRawData = await fbResponse.text();

      const fbItemRegex = /<item>([\s\S]*?)<\/item>/gi;
      const fbItems = [...fbRawData.matchAll(fbItemRegex)];

      const fbLocations = fbItems.map((itemMatch) => {
        const itemContent = itemMatch[1];
        const plateNo = getTag(itemContent, "carno");
        
        // carno가 있는 것만 실제 버스 위치임
        if (!plateNo || plateNo === "") return null;

        const gpsX = getTag(itemContent, "lin") || getTag(itemContent, "gpsX");
        const gpsY = getTag(itemContent, "lat") || getTag(itemContent, "gpsY");
        const nodeId = getTag(itemContent, "nodeid") || getTag(itemContent, "nodeId");
        const nodeNm = getTag(itemContent, "bstopnm") || getTag(itemContent, "nodeNm");

        if (!gpsX || !gpsY) return null;

        return {
          vehId: plateNo,
          lineId,
          nodeId,
          nodeNm,
          gpsX,
          gpsY,
          plateNo,
        };
      }).filter(Boolean);

      if (fbLocations.length > 0) {
        locations = fbLocations;
      }
    }

    return Response.json({ locations });
  } catch (error: any) {
    console.error("[Location Error]:", error.message);
    return Response.json(
      { error: "위치 조회 실패", details: error.message },
      { status: 500 }
    );
  }
}