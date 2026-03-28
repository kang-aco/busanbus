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

  const fetchRoutes = async (endpoint: string, paramName: string) => {
    const apiUrl = new URL(`https://apis.data.go.kr/6260000/BusanBIMS/${endpoint}`);
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set(paramName, lineNo);

    const response = await fetch(apiUrl.toString(), {
      headers: { Accept: "*/*", "User-Agent": "Mozilla/5.0" },
    });
    const rawData = await response.text();

    const getTag = (content: string, tag: string) => {
      const match = content.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`, "i"));
      return match ? match[1].trim() : "";
    };

    const resultCodeMatch = rawData.match(/<resultCode>\s*(.+?)\s*<\/resultCode>/i);
    const resultCode = resultCodeMatch ? resultCodeMatch[1].trim() : "";

    if (resultCode === "00") {
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      const items = [...rawData.matchAll(itemRegex)];
      
      return items.map((itemMatch) => {
        const itemContent = itemMatch[1];
        return {
          lineId: getTag(itemContent, "lineid") || getTag(itemContent, "lineId"),
          lineNo: getTag(itemContent, "lineno") || getTag(itemContent, "lineNo") || getTag(itemContent, "line_no"),
          busType: getTag(itemContent, "bustype") || getTag(itemContent, "busType"),
          companyId: getTag(itemContent, "companyid") || getTag(itemContent, "companyId"),
        };
      });
    }
    
    // 결과 없음 (01)
    if (resultCode === "01" || rawData.includes("결과가 없습니다")) {
      return [];
    }

    throw new Error(`API Error: ${resultCode}`);
  };

  try {
    let routes: any[] = [];
    
    try {
      // 1차 시도: busInfo (lineno)
      routes = await fetchRoutes("busInfo", "lineno");
    } catch (e) {
      console.warn("busInfo failed, trying getBusRouteList...");
    }

    if (routes.length === 0) {
      try {
        // 2차 시도: getBusRouteList (lineNo)
        routes = await fetchRoutes("getBusRouteList", "lineNo");
      } catch (e) {
        console.warn("getBusRouteList failed");
      }
    }

    return Response.json({ routes });
  } catch (error: any) {
    console.error("[Route List Error]:", error.message);
    return Response.json(
      { error: "노선 조회 실패", details: error.message },
      { status: 500 }
    );
  }
}