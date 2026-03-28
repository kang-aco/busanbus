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
    // ✅ busInfoByRouteId - 정류장 목록 + 실시간 버스 위치
    const apiUrl = new URL(
      "https://apis.data.go.kr/6260000/BusanBIMS/busInfoByRouteId"
    );
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("lineid", lineId);

    const response = await fetch(apiUrl.toString());
    const rawData = await response.text();

    const resultCodeMatch = rawData.match(/<resultCode>\s*(.+?)\s*<\/resultCode>/);
    const resultCode = resultCodeMatch ? resultCodeMatch[1].trim() : "";
    
    if (resultCode !== "00") {
      const resultMsgMatch = rawData.match(/<resultMsg>\s*(.+?)\s*<\/resultMsg>/);
      const resultMsg = resultMsgMatch ? resultMsgMatch[1].trim() : "Unknown error";
      return Response.json(
        { error: "API 오류", code: resultCode, details: resultMsg },
        { status: 502 }
      );
    }

    // <item> 태그들 추출
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = [...rawData.matchAll(itemRegex)];
    
    const locations = items
      .map((itemMatch) => {
        const itemContent = itemMatch[1];
        
        const getTag = (tag: string) => {
          const match = itemContent.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`));
          return match ? match[1].trim() : "";
        };

        const nodeId = getTag("nodeid");
        const plateNo = getTag("carno");
        const lineIdVal = getTag("lineid");
        const gpsX = getTag("lat");  // ✅ lat (위도)
        const gpsY = getTag("lin");  // ✅ lin (경도)

        // GPS 좌표가 있는 것만 반환 (실제 버스 위치)
        if (!gpsX || !gpsY) {
          return null;
        }

        return {
          vehId: `${lineIdVal}-${nodeId}-${plateNo}`,
          lineId: lineIdVal,
          lineNo: getTag("lineno"),
          nodeId,
          nodeNm: getTag("bstopnm"),  // ✅ 정류장명
          gpsX,
          gpsY,
          plateNo,
        };
      })
      .filter((loc) => loc !== null); // null 제거

    return Response.json({ locations });
  } catch (error: any) {
    console.error("[Location Error]:", error.message);
    return Response.json(
      { error: "위치 조회 실패", details: error.message },
      { status: 500 }
    );
  }
}