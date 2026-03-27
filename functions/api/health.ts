export async function onRequest(context: any) {
  const { env } = context;
  const busKey = env.BUSAN_BUS_API_KEY || "";

  return Response.json({
    status: "ok",
    busKey: !!busKey,
    busKeyLength: busKey.length,
    busKeyFirst10: busKey ? busKey.substring(0, 10) + "..." : "N/A",
    mapsKey: !!env.GOOGLE_MAPS_API_KEY,
    mapsKeyLength: (env.GOOGLE_MAPS_API_KEY || "").length,
    nodeEnv: env.NODE_ENV || "development",
    geminiKey: !!env.GEMINI_API_KEY,
    appUrl: env.APP_URL || "N/A",
  });
}
