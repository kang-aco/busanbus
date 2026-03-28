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

  // 🔍 여러 엔드포인트 시도
  const endpoints = [
    { name: "busInfo", params: { lineno: lineNo } },
    { name: "getBusRouteList", params: { lineno: lineNo } },
    { name: "getRouteList", params: { lineno: lineNo } },
    { name: "busRouteList", params: { lineno: lineNo } },
    { name: "getRouteInfo", params: { lineno: lineNo } },
  ];

  const results: any[] = [];

  for (const endpoint of endpoints) {
    try {
      const apiUrl = new URL(
        `https://apis.data.go.kr/6260000/BusanBIMS/${endpoint.name}`
      );
      apiUrl.searchParams.set("serviceKey", serviceKey);
      
      for (const [key, value] of Object.entries(endpoint.params)) {
        apiUrl.searchParams.set(key, String(value));
      }

      const response = await fetch(apiUrl.toString(), {
        headers: {
          Accept: "*/*",
          "User-Agent": "Mozilla/5.0",
        },
      });

      const rawData = await response.text();

      results.push({
        endpoint: endpoint.name,
        httpStatus: response.status,
        responsePreview: rawData.substring(0, 300),
        isXml: rawData.includes("<?xml") || rawData.includes("<response>"),
        hasResultCode: rawData.includes("<resultCode>"),
      });

      // 200이고 XML이면 성공 가능성
      if (response.status === 200 && rawData.includes("<resultCode>")) {
        const resultCodeMatch = rawData.match(/<resultCode>\s*(.+?)\s*<\/resultCode>/);
        const resultCode = resultCodeMatch ? resultCodeMatch[1].trim() : "";
        
        if (resultCode === "00") {
          // ✅ 성공! 이 엔드포인트 사용
          const itemRegex = /<item>([\s\S]*?)<\/item>/g;
          const items = [...rawData.matchAll(itemRegex)];
          
          const routes = items.map((itemMatch) => {
            const itemContent = itemMatch[1];
            
            const getTag = (tag: string) => {
              const match = itemContent.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`));
              return match ? match[1].trim() : "";
            };

            return {
              lineId: getTag("lineid"),
              lineNo: getTag("lineno") || getTag("buslinenum"),
              busType: getTag("bustype"),
              companyId: getTag("companyid"),
            };
          });

          return Response.json({ 
            routes,
            _debug: {
              successEndpoint: endpoint.name,
              itemCount: items.length
            }
          });
        }
      }

    } catch (error: any) {
      results.push({
        endpoint: endpoint.name,
        error: error.message,
      });
    }
  }

  // 모든 시도 실패
  return Response.json({
    error: "모든 엔드포인트 시도 실패",
    attempts: results,
  }, { status: 502 });
}