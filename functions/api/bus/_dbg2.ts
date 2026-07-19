// 임시 진단용 — 조사 후 삭제. 임의 BusanBIMS 엔드포인트를 그대로 호출해 원본을 본다.
export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint") || "stopArrByBstopid";
  const serviceKey = (env.BUSAN_BUS_API_KEY || "").trim();

  const api = new URL(`https://apis.data.go.kr/6260000/BusanBIMS/${endpoint}`);
  api.searchParams.set("serviceKey", serviceKey);
  // endpoint 외 모든 쿼리 파라미터를 그대로 전달
  for (const [k, v] of url.searchParams.entries()) {
    if (k === "endpoint") continue;
    api.searchParams.set(k, v);
  }

  const res = await fetch(api.toString(), { headers: { Accept: "*/*", "User-Agent": "Mozilla/5.0" } });
  const raw = await res.text();

  const getTag = (content: string, tag: string) => {
    const m = content.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`, "i"));
    return m ? m[1].trim() : "";
  };
  const items = [...raw.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  const tagNames = (s: string) => [...s.matchAll(/<([a-zA-Z0-9_]+)>/g)].map((m) => m[1]);

  return Response.json({
    endpoint,
    status: res.status,
    resultCode: (raw.match(/<resultCode>\s*(.+?)\s*<\/resultCode>/i) ?? [])[1] ?? "",
    resultMsg: (raw.match(/<resultMsg>\s*(.+?)\s*<\/resultMsg>/i) ?? [])[1] ?? "",
    itemCount: items.length,
    firstItemTags: items[0] ? tagNames(items[0][1]) : [],
    items: items.slice(0, 25).map((it) => ({
      lineno: getTag(it[1], "lineno") || getTag(it[1], "lineNo"),
      lineid: getTag(it[1], "lineid"),
      min1: getTag(it[1], "min1"),
      min2: getTag(it[1], "min2"),
      carno1: getTag(it[1], "carno1"),
      station1: getTag(it[1], "station1"),
      stationNm1: getTag(it[1], "stationNm1") || getTag(it[1], "stationnm1"),
      bstopnm: getTag(it[1], "bstopnm"),
      arsno: getTag(it[1], "arsno"),
    })),
    rawHead: raw.slice(0, 400),
  });
}
