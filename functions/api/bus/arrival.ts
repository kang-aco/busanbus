export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const stopId = url.searchParams.get("stopId");

  if (!stopId) {
    return Response.json({ error: "정류소 ID가 필요합니다." }, { status: 400 });
  }

  const serviceKey = (env.BUSAN_BUS_API_KEY || "").trim();
  if (!serviceKey) {
    return Response.json({ error: "BUSAN_BUS_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  const getTag = (content: string, tag: string) => {
    const match = content.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`, "i"));
    return match ? match[1].trim() : "";
  };

  const endpoints = [
    { name: "stopArrByBstopid", params: { bstopid: stopId } },
    { name: "getStopArrival",   params: { bstopid: stopId } },
    { name: "busStopArrival",   params: { bstopid: stopId } },
  ];

  for (const endpoint of endpoints) {
    try {
      const apiUrl = new URL(`https://apis.data.go.kr/6260000/BusanBIMS/${endpoint.name}`);
      apiUrl.searchParams.set("serviceKey", serviceKey);
      for (const [k, v] of Object.entries(endpoint.params)) {
        apiUrl.searchParams.set(k, String(v));
      }

      const response = await fetch(apiUrl.toString());
      const rawData = await response.text();

      if (!response.ok || !rawData.includes("<resultCode>")) continue;

      const resultCode = (rawData.match(/<resultCode>\s*(.+?)\s*<\/resultCode>/) ?? [])[1]?.trim();

      if (resultCode === "00") {
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const items = [...rawData.matchAll(itemRegex)];

        const arrivals = items.map((itemMatch) => {
          const c = itemMatch[1];
          // stationNm1/stationNm2는 정류소 이름, station1/station2는 ID
          const stationNm1 = getTag(c, "stationNm1") || getTag(c, "stationnm1");
          const stationNm2 = getTag(c, "stationNm2") || getTag(c, "stationnm2");
          return {
            lineId:   getTag(c, "lineid"),
            lineNo:   getTag(c, "lineno"),
            station1: stationNm1 || getTag(c, "station1"),
            station2: stationNm2 || getTag(c, "station2"),
            min1:     getTag(c, "min1"),
            min2:     getTag(c, "min2"),
            stopId:   getTag(c, "bstopid"),
          };
        });

        return Response.json({ arrivals });
      }

      if (resultCode === "01" || rawData.includes("결과가 없습니다")) {
        return Response.json({ arrivals: [] });
      }
    } catch {
      continue;
    }
  }

  return Response.json(
    { error: "도착 정보 조회 실패", details: "모든 엔드포인트 시도 실패" },
    { status: 502 }
  );
}
