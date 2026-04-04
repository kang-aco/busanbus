export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);

  const MAPS_KEY = env.GOOGLE_MAPS_API_KEY;
  if (!MAPS_KEY) {
    return Response.json(
      { error: "Google Maps API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  let origin = url.searchParams.get("origin");
  let destination = url.searchParams.get("destination");
  const mode = url.searchParams.get("mode") || "transit";

  if (!origin || !destination) {
    return Response.json(
      { error: "origin과 destination 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  const validModes = ["transit", "driving", "bicycling", "walking"];
  const safeMode = validModes.includes(mode) ? mode : "transit";

  // 부산 지역임을 명시해 더 정확한 결과 반환
  if (!origin.includes("부산")) origin = `부산 ${origin}`;
  if (!destination.includes("부산")) destination = `부산 ${destination}`;

  const params = new URLSearchParams({
    origin,
    destination,
    mode: safeMode,
    key: MAPS_KEY,
    language: "ko",
    region: "kr",
  });

  if (safeMode === "transit") {
    params.set("transit_mode", "bus|subway");
  }

  try {
    const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return Response.json(
        { error: "Google Directions API 호출 실패", details: response.statusText },
        { status: 502 }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error: any) {
    return Response.json(
      { error: "경로를 찾을 수 없습니다.", details: error?.message || "알 수 없는 오류" },
      { status: 500 }
    );
  }
}
