const getTag = (content: string, tag: string) => {
  const match = content.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`, "i"));
  return match ? match[1].trim() : "";
};

/** busInfoByRouteId로 노선의 기점·종점 정류소 이름을 가져옵니다 */
async function fetchTerminals(
  lineId: string,
  serviceKey: string
): Promise<{ startName: string; endName: string; startId: string; endId: string } | null> {
  try {
    const apiUrl = new URL("https://apis.data.go.kr/6260000/BusanBIMS/busInfoByRouteId");
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("lineid", lineId);

    const res = await fetch(apiUrl.toString(), {
      headers: { Accept: "*/*", "User-Agent": "Mozilla/5.0" },
    });
    const raw = await res.text();

    const resultCode = (raw.match(/<resultCode>\s*(.+?)\s*<\/resultCode>/i) ?? [])[1]?.trim();
    if (resultCode !== "00") return null;

    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = [...raw.matchAll(itemRegex)];

    const stops = items
      .map((m) => {
        const c = m[1];
        const seq = parseInt(getTag(c, "nodeno") || getTag(c, "stnno") || "0", 10);
        const name = getTag(c, "bstopnm") || getTag(c, "nodenm");
        const nodeId = getTag(c, "nodeid");
        const lat = getTag(c, "lat") || getTag(c, "gpsy");
        const lng = getTag(c, "lin") || getTag(c, "gpsx");
        if (!lat || !lng || !name) return null;
        return { seq, name, nodeId };
      })
      .filter(Boolean) as { seq: number; name: string; nodeId: string }[];

    if (stops.length === 0) return null;

    stops.sort((a, b) => a.seq - b.seq);
    const start = stops[0];
    const end = stops[stops.length - 1];

    return { startName: start.name, endName: end.name, startId: start.nodeId, endId: end.nodeId };
  } catch {
    return null;
  }
}

/**
 * station1/station2 값이 정류소 ID(숫자)이면 노선 기·종점 정보로 방면명을 해석합니다.
 * 이미 이름 형태이면 그대로 반환합니다.
 */
function resolveDirection(
  stationValue: string,
  terminals: { startName: string; endName: string; startId: string; endId: string } | null
): string {
  if (!stationValue) return "";

  // 숫자가 아닌 문자가 섞여 있으면 이미 이름 (예: "해운대", "구포역")
  if (!/^\d+$/.test(stationValue)) {
    return stationValue.endsWith("방면") ? stationValue : `${stationValue} 방면`;
  }

  // 숫자 ID — 기·종점 nodeId와 비교
  if (terminals) {
    if (stationValue === terminals.startId) return `${terminals.startName} 방면`;
    if (stationValue === terminals.endId) return `${terminals.endName} 방면`;
    // 어느 쪽이든 판별 불가이면 종점 방면으로 fallback
    return `${terminals.endName} 방면`;
  }

  return "";
}

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

        const rawArrivals = items.map((itemMatch) => {
          const c = itemMatch[1];
          return {
            lineId:   getTag(c, "lineid"),
            lineNo:   getTag(c, "lineno"),
            station1: getTag(c, "station1"),
            station2: getTag(c, "station2"),
            min1:     getTag(c, "min1"),
            min2:     getTag(c, "min2"),
            stopId:   getTag(c, "bstopid"),
          };
        });

        // 고유 lineId 별로 기·종점 정보 병렬 조회
        const uniqueLineIds = [...new Set(rawArrivals.map((a) => a.lineId).filter(Boolean))];
        const terminalMap = new Map<string, Awaited<ReturnType<typeof fetchTerminals>>>();

        await Promise.all(
          uniqueLineIds.map(async (lid) => {
            const t = await fetchTerminals(lid, serviceKey);
            terminalMap.set(lid, t);
          })
        );

        const arrivals = rawArrivals.map((a) => {
          const terminals = terminalMap.get(a.lineId) ?? null;
          return {
            ...a,
            direction: resolveDirection(a.station1, terminals),
            // 종점/기점 이름도 함께 전달 (UI 표시용)
            terminalStart: terminals?.startName ?? "",
            terminalEnd:   terminals?.endName   ?? "",
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
