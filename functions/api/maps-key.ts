export async function onRequest(context: any) {
  const { env } = context;
  const MAPS_KEY = env.GOOGLE_MAPS_API_KEY;

  if (!MAPS_KEY) {
    return Response.json(
      { error: "Google Maps API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  return Response.json({
    key: MAPS_KEY,
    mapId: env.GOOGLE_MAPS_MAP_ID || null,
  });
}
