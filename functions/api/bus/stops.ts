export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const stopName = url.searchParams.get("stopName");

  if (!stopName) {
    return Response.json({ error: "정류소 이름이 필요합니다." }, { status: 400 });
  }

  const serviceKey = (env.BUSAN_BUS_API_KEY || "").trim();
  
  if (!serviceKey) {
    return Response.json(
      { error: "BUSAN_BUS_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    // ✅ busStopList - 정류소 이름으로 검색
    const apiUrl = new URL(
      "https://apis.data.go.kr/6260000/BusanBIMS/busStopList"
    );
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("bstopnm", stopName);

    const response = await fetch(apiUrl.toString(), {
      headers: {
        Accept: "*/*",
        "User-Agent": "Mozilla/5.0",
      },
    });

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
    
    const stops = items.map((itemMatch) => {
      const itemContent = itemMatch[1];
      
      const getTag = (tag: string) => {
        const match = itemContent.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`));
        return match ? match[1].trim() : "";
      };

      return {
        stopId: getTag("bstopid"),
        stopName: getTag("bstopnm"),
        arsno: getTag("arsno"),
        gpsX: getTag("gpsx") || getTag("lat"),
        gpsY: getTag("gpsy") || getTag("lin"),
      };
    });

    return Response.json({ stops });
  } catch (error: any) {
    console.error("[Stop Search Error]:", error.message);
    return Response.json(
      { error: "정류소 검색 실패", details: error.message },
      { status: 500 }
    );
  }
}