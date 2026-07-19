// 특정 정류소에서 버스가 다음으로 향하는 정류소 이름을 조회한다.
// 같은 이름의 정류소가 방향별로 나뉘어 있을 때 방향 구분용으로 사용한다.
// 1) 도착정보로 정류소를 지나는 노선 lineId 확보
// 2) 노선 정류장 순서에서 현재 정류소의 다음 정류소를 반환
export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const stopId = url.searchParams.get("stopId");
  const arsno = url.searchParams.get("arsno") || "";

  if (!stopId) {
    return Response.json({ error: "정류소 ID가 필요합니다." }, { status: 400 });
  }

  const serviceKey = (env.BUSAN_BUS_API_KEY || "").trim();
  if (!serviceKey) {
    return Response.json({ error: "BUSAN_BUS_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  const getTag = (content: string, tag: string) => {
    const m = content.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`, "i"));
    return m ? m[1].trim() : "";
  };

  const fetchXml = async (endpoint: string, params: Record<string, string>) => {
    const api = new URL(`https://apis.data.go.kr/6260000/BusanBIMS/${endpoint}`);
    api.searchParams.set("serviceKey", serviceKey);
    for (const [k, v] of Object.entries(params)) api.searchParams.set(k, v);
    const res = await fetch(api.toString(), {
      headers: { Accept: "*/*", "User-Agent": "Mozilla/5.0" },
    });
    return res.text();
  };

  try {
    // 1) 이 정류소를 지나는 노선 lineId 확보 (도착정보 이용)
    const arrRaw = await fetchXml("stopArrByBstopid", { bstopid: stopId });
    const arrItems = [...arrRaw.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

    const lineIds: string[] = [];
    for (const it of arrItems) {
      const lid = getTag(it[1], "lineid") || getTag(it[1], "lineId");
      if (lid && !lineIds.includes(lid)) lineIds.push(lid);
    }

    if (lineIds.length === 0) {
      return Response.json({ nextStop: "" });
    }

    // 2) 후보 노선들의 정류장 순서에서 현재 정류소의 다음 정류소를 찾는다
    for (const lineId of lineIds.slice(0, 3)) {
      const rsRaw = await fetchXml("busInfoByRouteId", { lineid: lineId });
      const rsItems = [...rsRaw.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

      const stops = rsItems
        .map((it) => {
          const c = it[1];
          return {
            seq: parseInt(getTag(c, "nodeno") || getTag(c, "stnno") || "0", 10),
            name: getTag(c, "bstopnm") || getTag(c, "nodenm") || getTag(c, "nodeNm"),
            bstopid: getTag(c, "bstopid"),
            nodeId: getTag(c, "nodeid") || getTag(c, "nodeId"),
            arsno: getTag(c, "arsno"),
          };
        })
        .filter((s) => s.name)
        .sort((a, b) => a.seq - b.seq);

      const idx = stops.findIndex(
        (s) =>
          (s.bstopid && s.bstopid === stopId) ||
          (s.nodeId && s.nodeId === stopId) ||
          (arsno && s.arsno === arsno)
      );

      if (idx !== -1 && idx < stops.length - 1) {
        return Response.json({ nextStop: stops[idx + 1].name, lineId });
      }
    }

    return Response.json({ nextStop: "" });
  } catch (error: any) {
    return Response.json({ nextStop: "" });
  }
}
