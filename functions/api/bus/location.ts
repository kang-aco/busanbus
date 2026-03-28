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
    const apiUrl = new URL(
      "https://apis.data.go.kr/6260000/BusanBmsService/busInfoByRouteId"
    );
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("lineid", lineId);

    const response = await fetch(apiUrl.toString());
    const rawData = await response.text();

    const resultCodeMatch = rawData.match(/<resultCode>(.+?)<\/resultCode>/);
    const resultCode = resultCodeMatch ? resultCodeMatch[1] : "";
    
    if (resultCode !== "00") {
      const resultMsgMatch = rawData.match(/<resultMsg>(.+?)<\/resultMsg>/);
      const resultMsg = resultMsgMatch ? resultMsgMatch[1] : "Unknown error";
      return Response.json(
        { error: "API 오류", code: resultCode, details: resultMsg },
        { status: 502 }
      );
    }

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = [...rawData.matchAll(itemRegex)];
    
    const locations = items.map((itemMatch) => {
      const itemContent = itemMatch[1];
      
      const getTag = (tag: string) => {
        const match = itemContent.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
        return match ? match[1] : "";
      };

      const nodeId = getTag("nodeid");
      const plateNo = getTag("carno");
      const lineIdVal = getTag("lineid");

      return {
        vehId: `${lineIdVal}-${nodeId}-${plateNo}`,
        lineId: lineIdVal,
        lineNo: getTag("lineno"),
        nodeId,
        nodeNm: getTag("nodenm"),
        gpsX: getTag("gpsx"),
        gpsY: getTag("gpsy"),
        plateNo,
      };
    });

    return Response.json({ locations });
  } catch (error: any) {
    console.error("[Location Error]:", error.message);
    return Response.json(
      { error: "위치 조회 실패", details: error.message },
      { status: 500 }
    );
  }
}