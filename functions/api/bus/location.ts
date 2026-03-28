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

  // 🔍 여러 엔드포인트 시도
  const endpoints = [
    { name: "busInfoByRouteId", params: { lineid: lineId } },
    { name: "getBusInfoByRouteId", params: { lineid: lineId } },
    { name: "busLocationByRouteId", params: { lineid: lineId } },
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
          
          const locations = items.map((itemMatch) => {
            const itemContent = itemMatch[1];
            
            const getTag = (tag: string) => {
              const match = itemContent.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`));
              return match ? match[1].trim() : "";
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
        }
      }
    } catch (error) {
      continue;
    }
  }

  return Response.json(
    { error: "위치 조회 실패", details: "모든 엔드포인트 시도 실패" },
    { status: 502 }
  );
}