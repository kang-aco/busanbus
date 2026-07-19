// 임시 진단용 엔드포인트 — 조사 후 삭제 예정
export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const lineId = url.searchParams.get("lineId") || "5200307000";
  const endpoint = url.searchParams.get("endpoint") || "busInfoByRouteId";
  const serviceKey = (env.BUSAN_BUS_API_KEY || "").trim();

  const api = new URL(`https://apis.data.go.kr/6260000/BusanBIMS/${endpoint}`);
  api.searchParams.set("serviceKey", serviceKey);
  api.searchParams.set("lineid", lineId);

  const res = await fetch(api.toString(), { headers: { Accept: "*/*", "User-Agent": "Mozilla/5.0" } });
  const contentType = res.headers.get("content-type") || "";
  const buf = await res.arrayBuffer();

  const utf8 = new TextDecoder("utf-8").decode(buf);
  let euckr = "";
  try {
    euckr = new TextDecoder("euc-kr").decode(buf);
  } catch (e: any) {
    euckr = "EUC-KR decode unsupported: " + e.message;
  }

  const items = [...utf8.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  const tagNames = (s: string) => [...s.matchAll(/<([a-zA-Z0-9_]+)>/g)].map((m) => m[1]);

  // euc-kr 로 파싱한 item 도 확인
  const euckrItems = [...euckr.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  const getTag = (content: string, tag: string) => {
    const m = content.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*<\\/${tag}>`, "i"));
    return m ? m[1].trim() : "";
  };

  // 첫 bstopnm 의 원본 바이트를 hex 로 추출 (진짜 인코딩 판별용)
  const bytes = new Uint8Array(buf);
  const ascii = new TextDecoder("latin1").decode(buf); // 바이트=코드포인트 1:1
  const startTag = "<bstopnm>";
  const endTag = "</bstopnm>";
  const si = ascii.indexOf(startTag);
  const ei = ascii.indexOf(endTag, si);
  let nameHex = "";
  if (si !== -1 && ei !== -1) {
    const from = si + startTag.length;
    const slice = bytes.slice(from, ei);
    nameHex = Array.from(slice).map((b) => b.toString(16).padStart(2, "0")).join(" ");
  }

  const withCarno = euckrItems.filter((it) => getTag(it[1], "carno")).length;
  const withGps = euckrItems.filter(
    (it) => getTag(it[1], "gpsx") || getTag(it[1], "lin")
  ).length;

  return Response.json({
    endpoint,
    lineId,
    contentType,
    itemCount: items.length,
    nameHex,
    withCarno,
    withGps,
    firstItemTags: items[0] ? tagNames(items[0][1]) : [],
    utf8_sample: utf8.slice(0, 600),
    euckr_sample: euckr.slice(0, 600),
    // euc-kr 로 디코드한 앞 12개 item 의 주요 필드
    euckr_items: euckrItems.slice(0, 12).map((it) => ({
      ord: getTag(it[1], "nodeord") || getTag(it[1], "nodeno") || getTag(it[1], "stnno") || getTag(it[1], "seq"),
      nm: getTag(it[1], "nodenm") || getTag(it[1], "bstopnm"),
      id: getTag(it[1], "nodeid") || getTag(it[1], "bstopid"),
      ars: getTag(it[1], "arsno"),
      car: getTag(it[1], "carno"),
    })),
  });
}
