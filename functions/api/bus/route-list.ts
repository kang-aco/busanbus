export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const lineNo = url.searchParams.get("lineNo");

  if (!lineNo) {
    return Response.json({ error: "노선 번호가 필요합니다." }, { status: 400 });
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
      "https://apis.data.go.kr/6260000/BusanBmsService/getBusRouteList"
    );
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("lineNo", lineNo);

    console.log("[Route List] Calling API...");

    const response = await fetch(apiUrl.toString(), {
      headers: {
        Accept: "*/*",
        "User-Agent": "Mozilla/5.0",
      },
    });

    const rawData = await response.text();
    console.log("[Route List] Response received, length:", rawData.length);

    // XML 파싱
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rawData, "text/xml");
    
    // resultCode 확인
    const resultCode = xmlDoc.querySelector("resultCode")?.textContent || "";
    
    if (resultCode !== "00") {
      const resultMsg = xmlDoc.querySelector("resultMsg")?.textContent || "Unknown error";
      return Response.json(
        { error: "API 오류", code: resultCode, details: resultMsg },
        { status: 502 }
      );
    }

    // 노선 데이터 추출
    const items = xmlDoc.querySelectorAll("item");
    const routes = Array.from(items).map((item) => ({
      lineId: item.querySelector("lineid")?.textContent || "",
      lineNo: item.querySelector("buslinenum")?.textContent || "",
      busType: item.querySelector("bustype")?.textContent || "",
      companyId: item.querySelector("companyid")?.textContent || "",
    }));

    console.log("[Route List] Parsed routes:", routes.length);

    return Response.json({ routes });
  } catch (error: any) {
    console.error("[Route List Error]:", error.message);
    return Response.json(
      { error: "노선 조회 실패", details: error.message },
      { status: 500 }
    );
  }
}