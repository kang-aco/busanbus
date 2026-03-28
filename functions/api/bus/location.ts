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
    // busInfoByRouteId 사용 (이전에 성공한 엔드포인트)
    const apiUrl = new URL(
      "https://apis.data.go.kr/6260000/BusanBIMS/busInfoByRouteId"
    );
    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("lineid", lineId);

    const response = await fetch(apiUrl.toString());
    const rawData = await response.text();

    // 🔍 디버깅: 원본 XML 반환
    return Response.json({
      _debug: true,
      httpStatus: response.status,
      rawDataPreview: rawData.substring(0, 2000),
      rawDataFull: rawData,
    });

  } catch (error: any) {
    return Response.json(
      { error: "위치 조회 실패", details: error.message },
      { status: 500 }
    );
  }
}