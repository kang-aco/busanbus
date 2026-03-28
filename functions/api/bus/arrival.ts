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

  // 🔍 여러 엔드포인트 시도
  const endpoints = [
    { name: "stopArrByBstopid", params: { bstopid: stopId } },
    { name: "getStopArrival", params: { bstopid: stopId } },
    { name: "busStopArrival", params: { bstopid: stopId } },
  ];

  for (const endpoint of endpoints) {
    try {
      const apiUrl = new URL(
        `https://apis.data.go.kr/6260000/BusanBIMS/${endpoint.name}`
      );
      apiUrl.searchParams.set("serviceKey", serviceKey);
      
      for (const [key, value] of Object.entries(endpoint.params)) {
        apiUrl.searchParams.set(key, String(value));
      }

      const response = await fetch(apiUrl.toString());
      const rawData = await response.text();

      if (response.status === 200 && rawData.includes("<resultCode>")) {
        const resultCodeMatch = rawData.match(/<resultCode>\s*(.+?)\s*<\/resultCode>/);
        const resultCode = resultCodeMatch ? resultCodeMatch[1].trim() : "";
        
        if (resultCode === "00") {
          const itemRegex = /<item>([\s\S]*?)<\/item>/g;
          const items = [...rawData.matchAll(itemRegex)];
          
          const arrivals = items.map((itemMatch) => {
            const itemContent = itemMatch[1];
            
            const getTag = (tag: string) => {
              const match = itemContent.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`, "i"));
              return match ? match[1].trim() : "";
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
        }

        if (resultCode === "01" || rawData.includes("결과가 없습니다")) {
          return Response.json({ arrivals: [] });
        }
      }
    } catch (error) {
      continue;
    }
  }

  return Response.json(
    { error: "도착 정보 조회 실패", details: "모든 엔드포인트 시도 실패" },
    { status: 502 }
  );
}