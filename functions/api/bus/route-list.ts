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

  // 🔍 디버깅: 키 정보 확인
  const keyInfo = {
    length: serviceKey.length,
    first10: serviceKey.substring(0, 10),
    last10: serviceKey.substring(serviceKey.length - 10),
    hasPlus: serviceKey.includes('+'),
    hasSlash: serviceKey.includes('/'),
  };

  try {
    // ✅ 여러 서비스명/엔드포인트 시도
    const attempts = [
      {
        service: "BusanBmsService",
        endpoint: "getBusRouteList",
        params: { lineNo }
      },
      {
        service: "BusanBIS",
        endpoint: "busRouteList", 
        params: { lineno: lineNo }
      },
      {
        service: "busanBIMS",
        endpoint: "getBusRouteInfo",
        params: { lineNo }
      }
    ];

    for (const attempt of attempts) {
      const apiUrl = new URL(
        `https://apis.data.go.kr/6260000/${attempt.service}/${attempt.endpoint}`
      );
      apiUrl.searchParams.set("serviceKey", serviceKey);
      
      for (const [key, value] of Object.entries(attempt.params)) {
        apiUrl.searchParams.set(key, String(value));
      }

      console.log(`[Attempt] ${attempt.service}/${attempt.endpoint}`);

      const response = await fetch(apiUrl.toString(), {
        headers: {
          Accept: "*/*",
          "User-Agent": "Mozilla/5.0",
        },
      });

      const rawData = await response.text();
      const preview = rawData.substring(0, 200);

      console.log(`[Response] ${preview}`);

      // "Unexpected errors" 체크
      if (rawData.includes("Unexpected errors")) {
        console.log(`[Failed] ${attempt.service}/${attempt.endpoint} - Unexpected errors`);
        continue; // 다음 시도
      }

      // resultCode 확인
      const resultCodeMatch = rawData.match(/<resultCode>\s*(.+?)\s*<\/resultCode>/);
      const resultCode = resultCodeMatch ? resultCodeMatch[1].trim() : "";

      if (resultCode === "00") {
        // ✅ 성공! 데이터 파싱
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const items = [...rawData.matchAll(itemRegex)];
        
        const routes = items.map((itemMatch) => {
          const itemContent = itemMatch[1];
          
          const getTag = (tag: string) => {
            const match = itemContent.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`));
            return match ? match[1].trim() : "";
          };

          return {
            lineId: getTag("lineid") || getTag("lineId"),
            lineNo: getTag("buslinenum") || getTag("lineNo") || getTag("lineno"),
            busType: getTag("bustype") || getTag("busType"),
            companyId: getTag("companyid") || getTag("companyId"),
          };
        });

        return Response.json({ 
          routes,
          _debug: {
            usedService: attempt.service,
            usedEndpoint: attempt.endpoint,
            keyInfo
          }
        });
      }
    }

    // 모든 시도 실패
    return Response.json(
      { 
        error: "모든 API 호출 실패", 
        details: "모든 서비스명/엔드포인트 조합에서 Unexpected errors 발생",
        keyInfo,
        tried: attempts.map(a => `${a.service}/${a.endpoint}`)
      },
      { status: 502 }
    );

  } catch (error: any) {
    console.error("[Route List Error]:", error.message);
    return Response.json(
      { error: "노선 조회 실패", details: error.message, keyInfo },
      { status: 500 }
    );
  }
}