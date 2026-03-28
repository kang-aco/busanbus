export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const stopId = url.searchParams.get("stopId");

  if (!stopId) {
    return Response.json({ error: "정류소 ID가 필요합니다." }, { status: 400 });
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
      "https://apis.data.go.kr/6260000/BusanBmsService/stopArrByBstopid"
    );
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("bstopid", stopId);

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
    
    const arrivals = items.map((itemMatch) => {
      const itemContent = itemMatch[1];
      
      const getTag = (tag: string) => {
        const match = itemContent.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
        return match ? match[1] : "";
      };

      return {
        lineId: getTag("lineid"),
        lineNo: getTag("lineno"),
        station1: getTag("station1"),
        station2: getTag("station2"),
        min1: getTag("min1"),
        min2: getTag("min2"),
        stopId: getTag("bstopid"),
      };
    });

    return Response.json({ arrivals });
  } catch (error: any) {
    console.error("[Arrival Error]:", error.message);
    return Response.json(
      { error: "도착 정보 조회 실패", details: error.message },
      { status: 500 }
    );
  }
}