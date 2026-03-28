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

  try {
    const apiUrl = new URL(
      "https://apis.data.go.kr/6260000/BusanBmsService/stopArrByBstopid"
    );
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("bstopid", stopId);

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
    const arrivals = Array.from(items).map((item) => ({
      lineId: item.querySelector("lineid")?.textContent || "",
      lineNo: item.querySelector("lineno")?.textContent || "",
      station1: item.querySelector("station1")?.textContent || "",
      station2: item.querySelector("station2")?.textContent || "",
      min1: item.querySelector("min1")?.textContent || "",
      min2: item.querySelector("min2")?.textContent || "",
      stopId: item.querySelector("bstopid")?.textContent || "",
    }));

    return Response.json({ arrivals });
  } catch (error: any) {
    console.error("[Arrival Error]:", error.message);
    return Response.json(
      { error: "도착 정보 조회 실패", details: error.message },
      { status: 500 }
    );
  }
}