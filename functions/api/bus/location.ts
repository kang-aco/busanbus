import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
});

function parseXmlToJson(xmlData: string) {
  try {
    return xmlParser.parse(xmlData);
  } catch (e) {
    console.error("[XML Parse Error]:", e);
    return null;
  }
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function normalizeLocations(data: any): any[] {
  const raw = toArray(
    data?.response?.body?.items?.item ?? data?.body?.items?.item
  );

  return raw.map((item: any) => {
    const nodeId = String(item.nodeId || item.nodeid || "");
    const plateNo = String(item.plateNo || item.carNo || item.carno || "");
    const lineId = String(item.lineId || item.lineid || "");

    return {
      vehId: String(
        item.vehId || item.vehid || `${lineId}-${nodeId}-${plateNo || "bus"}`
      ),
      lineId,
      lineNo: String(item.lineNo || item.lineno || ""),
      nodeId,
      nodeNm: String(item.nodeNm || item.nodenm || ""),
      gpsX: String(item.gpsX || item.gpsx || item.posX || ""),
      gpsY: String(item.gpsY || item.gpsy || item.posY || ""),
      lowPlate: String(item.lowPlate || item.lowplate || ""),
      plateNo,
      stopSeq: String(item.stopSeq || item.stopseq || ""),
    };
  });
}

function getHeader(data: any) {
  return data?.response?.header || data?.header || data?.cmmMsgHeader || {};
}

function getResultCode(header: any) {
  return String(header?.resultCode ?? header?.returnReasonCode ?? "").trim();
}

export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const lineId = url.searchParams.get("lineId");

  if (!lineId) {
    return Response.json({ error: "노선 ID가 필요합니다." }, { status: 400 });
  }

  const serviceKey = env.BUSAN_BUS_API_KEY;
  if (!serviceKey) {
    return Response.json(
      { error: "BUSAN_BUS_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const apiUrl = new URL(
      "https://apis.data.go.kr/6260000/BusanBmsService/busInfoByRouteId"
    );
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("_type", "json");
    apiUrl.searchParams.set("lineid", lineId);

    const response = await fetch(apiUrl.toString(), {
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0",
      },
    });

    const rawData = await response.text();
    let data: any = null;

    try {
      data = JSON.parse(rawData);
    } catch {
      if (
        rawData.includes("<response>") ||
        rawData.includes("<cmmMsgHeader>") ||
        rawData.includes("<?xml")
      ) {
        data = parseXmlToJson(rawData);
      } else {
        if (
          rawData.includes("Unexpected errors") ||
          rawData.includes("SERVICE KEY IS NOT REGISTERED")
        ) {
          return Response.json(
            { error: "API 인증 실패", details: rawData.substring(0, 200) },
            { status: 401 }
          );
        }
        return Response.json(
          { error: "알 수 없는 API 응답", details: rawData.substring(0, 200) },
          { status: 502 }
        );
      }
    }

    const header = getHeader(data);
    const resultCode = getResultCode(header);

    if (resultCode && resultCode !== "00" && resultCode !== "0") {
      return Response.json(
        {
          error: "API 오류",
          code: resultCode,
          details: header?.resultMsg || "알 수 없는 오류",
        },
        { status: 502 }
      );
    }

    const locations = normalizeLocations(data);
    return Response.json({ locations });
  } catch (error: any) {
    console.error("[Location Error]:", error);
    return Response.json(
      { error: "위치 조회 실패", details: error.message },
      { status: 500 }
    );
  }
}