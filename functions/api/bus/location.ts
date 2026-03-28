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

  try {
    const apiUrl = new URL(
      "https://apis.data.go.kr/6260000/BusanBmsService/busInfoByRouteId"
    );
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("lineid", lineId);

    const response = await fetch(apiUrl.toString());
    const rawData = await response.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rawData, "text/xml");
    
    const resultCode = xmlDoc.querySelector("resultCode")?.textContent || "";
    
    if (resultCode !== "00") {
      const resultMsg = xmlDoc.querySelector("resultMsg")?.textContent || "Unknown error";
      return Response.json(
        { error: "API 오류", code: resultCode, details: resultMsg },
        { status: 502 }
      );
    }

    const items = xmlDoc.querySelectorAll("item");
    const locations = Array.from(items).map((item) => {
      const nodeId = item.querySelector("nodeid")?.textContent || "";
      const plateNo = item.querySelector("carno")?.textContent || "";
      const lineId = item.querySelector("lineid")?.textContent || "";

      return {
        vehId: `${lineId}-${nodeId}-${plateNo}`,
        lineId,
        lineNo: item.querySelector("lineno")?.textContent || "",
        nodeId,
        nodeNm: item.querySelector("nodenm")?.textContent || "",
        gpsX: item.querySelector("gpsx")?.textContent || "",
        gpsY: item.querySelector("gpsy")?.textContent || "",
        plateNo,
      };
    });

    return Response.json({ locations });
  } catch (error: any) {
    console.error("[Location Error]:", error.message);
    return Response.json(
      { error: "위치 조회 실패", details: error.message },
      { status: 500 }
    );
  }
}