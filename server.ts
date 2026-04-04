import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";

import {
  normalizeRoutes,
  normalizeLocations,
  normalizeArrivals,
} from "./src/lib/bus-api/normalize";
import { callBusApi, handleApiError, getFirstQueryValue } from "./functions/busApi";
import { onRequest as handleHealth } from "./functions/api/health";
import { onRequest as handleMapsKey } from "./functions/api/maps-key";
import { onRequest as handleRouteList } from "./functions/api/bus/route-list";
import { onRequest as handleLocation } from "./functions/api/bus/location";
import { onRequest as handleArrival } from "./functions/api/bus/arrival";
import { onRequest as handleStops } from "./functions/api/bus/stops";
import { onRequest as handleRouteStops } from "./functions/api/bus/route-stops";

dotenv.config();

/**
 * Cloudflare Pages style onRequest 함수를 Express 핸들러로 변환하는 어댑터
 */
const adaptOnRequest = (handler: any) => async (req: express.Request, res: express.Response) => {
  try {
    const protocol = req.protocol;
    const host = req.get("host");
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;

    const context = {
      request: {
        url: fullUrl,
        headers: req.headers,
        method: req.method,
      },
      env: process.env,
    };

    const response = await handler(context);
    const data = await response.json();
    res.status(response.status || 200).json(data);
  } catch (error: any) {
    console.error("[Adapter Error]:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  // ===================================================================
  // 🔥 중요: API 라우트를 가장 먼저 정의 (정적 파일보다 우선)
  // ===================================================================

  app.get("/api/health", adaptOnRequest(handleHealth));

  app.get("/api/bus/route-list", adaptOnRequest(handleRouteList));

  app.get("/api/bus/location", adaptOnRequest(handleLocation));

  app.get("/api/bus/arrival", adaptOnRequest(handleArrival));

  app.get("/api/bus/stops", adaptOnRequest(handleStops));

  app.get("/api/bus/route-stops", adaptOnRequest(handleRouteStops));

  app.get("/api/bus/debug", async (req, res) => {
    try {
      const endpoint = getFirstQueryValue(req.query.endpoint);

      if (!endpoint) {
        return res.status(400).json({
          error: "endpoint 파라미터가 필요합니다.",
        });
      }

      const service =
        getFirstQueryValue(req.query.service) || "BusanBmsService";

      const params: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(req.query)) {
        if (key === "endpoint" || key === "service") continue;
        params[key] = value;
      }

      const data = await callBusApi(endpoint, params, service);

      return res.json({
        _debug: true,
        _endpoint: endpoint,
        _service: service,
        _params: params,
        _responseKeys: Object.keys(data || {}),
        _fullResponse: data,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: error?.message || "디버그 호출 실패",
        details: error?.details,
      });
    }
  });

  app.get("/api/maps-key", adaptOnRequest(handleMapsKey));

  app.get("/api/directions", async (req, res) => {
    const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;

    if (!MAPS_KEY) {
      return res.status(500).json({
        error: "Google Maps API 키가 설정되지 않았습니다.",
        details:
          "Secrets 또는 .env에서 GOOGLE_MAPS_API_KEY를 설정해 주세요. Directions API 활성화도 필요합니다.",
      });
    }

    try {
      let origin = getFirstQueryValue(req.query.origin);
      let destination = getFirstQueryValue(req.query.destination);

      if (!origin || !destination) {
        return res.status(400).json({
          error: "origin과 destination 파라미터가 필요합니다.",
        });
      }

      if (!origin.includes("부산")) origin = `부산 ${origin}`;
      if (!destination.includes("부산")) destination = `부산 ${destination}`;

      console.log(`[Directions] Searching route: ${origin} -> ${destination}`);

      const travelMode = getFirstQueryValue(req.query.mode) || "transit";
      const validModes = ["transit", "driving", "bicycling", "walking"];
      const safeMode = validModes.includes(travelMode) ? travelMode : "transit";

      const directionsParams: Record<string, string> = {
        origin,
        destination,
        mode: safeMode,
        key: MAPS_KEY,
        language: "ko",
        region: "kr",
      };

      if (safeMode === "transit") {
        directionsParams.transit_mode = "bus|subway";
      }

      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/directions/json",
        {
          params: directionsParams,
          timeout: 15000,
        }
      );

      return res.json(response.data);
    } catch (error: any) {
      console.error(
        "[Directions Error]:",
        error?.response?.data || error?.message
      );

      return res.status(500).json({
        error: "경로를 찾을 수 없습니다.",
        details:
          error?.response?.data?.error_message ||
          error?.message ||
          "알 수 없는 오류",
      });
    }
  });

  // 404 핸들러 - API 엔드포인트를 찾지 못한 경우
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      error: "API 엔드포인트를 찾을 수 없습니다.",
      path: req.path,
    });
  });

  // ===================================================================
  // 🔥 정적 파일 서빙은 API 라우트 이후에 배치
  // ===================================================================

  if (process.env.NODE_ENV !== "production") {
    // 개발 모드: Vite 미들웨어
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    // 프로덕션 모드: 빌드된 정적 파일 서빙
    const distPath = path.join(process.cwd(), "dist");

    // 정적 파일 서빙
    app.use(express.static(distPath));

    // SPA fallback - 모든 나머지 요청은 index.html로
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("[Server Startup Error]:", error);
  process.exit(1);
});