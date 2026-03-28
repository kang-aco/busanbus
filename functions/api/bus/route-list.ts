export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const lineNo = url.searchParams.get("lineNo");

  if (!lineNo) {
    return Response.json({ error: "노선 번호가 필요합니다." }, { status: 400 });
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
      "https://apis.data.go.kr/6260000/BusanBmsService/getBusRouteList"
    );
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("lineNo", lineNo);

    const response = await fetch(apiUrl.toString(), {
      headers: {
        Accept: "*/*",
        "User-Agent": "Mozilla/5.0",
      },
    });

    const rawData = await response.text();

    // resultCode 확인 (간단한 정규식)
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

    // <item> 태그들 추출
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = [...rawData.matchAll(itemRegex)];
    
    const routes = items.map((itemMatch) => {
      const itemContent = itemMatch[1];
      
      const getTag = (tag: string) => {
        const match = itemContent.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
        return match ? match[1] : "";
      };

      return {
        lineId: getTag("lineid"),
        lineNo: getTag("buslinenum"),
        busType: getTag("bustype"),
        companyId: getTag("companyid"),
      };
    });

    return Response.json({ routes });
  } catch (error: any) {
    console.error("[Route List Error]:", error.message);
    return Response.json(
      { error: "노선 조회 실패", details: error.message },
      { status: 500 }
    );
  }
}