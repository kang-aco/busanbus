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
      "https://apis.data.go.kr/6260000/BusanBIMS/getRouteInfo"
    );
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("lineno", lineNo);

    const response = await fetch(apiUrl.toString(), {
      headers: {
        Accept: "*/*",
        "User-Agent": "Mozilla/5.0",
      },
    });

    const rawData = await response.text();

    // 🔍 디버깅: 원본 응답 전체 반환
    return Response.json({
      _debug: true,
      httpStatus: response.status,
      rawDataLength: rawData.length,
      rawDataPreview: rawData.substring(0, 1000),
      rawDataFull: rawData, // 전체 응답
      keyInfo: {
        length: serviceKey.length,
        first10: serviceKey.substring(0, 10),
        last10: serviceKey.substring(serviceKey.length - 10),
      }
    });

  } catch (error: any) {
    console.error("[Route List Error]:", error.message);
    return Response.json(
      { error: "노선 조회 실패", details: error.message },
      { status: 500 }
    );
  }
}