import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";
import { XMLParser } from "fast-xml-parser";

import {
  normalizeRoutes,
  normalizeLocations,
  normalizeArrivals,
} from "./src/lib/bus-api/normalize";

dotenv.config();

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

function getFirstQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? "").trim();
  }
  return String(value ?? "").trim();
}

function maskSecretInText(text: string, secret: string) {
  if (!secret) return text;
  return text.split(secret).join("***MASKED***");
}

function getHeader(data: any) {
  return data?.response?.header || data?.header || data?.cmmMsgHeader || {};
}

function getResultCode(header: any) {
  return String(header?.resultCode ?? header?.returnReasonCode ?? "").trim();
}

function getResultMessage(header: any) {
  return String(header?.resultMsg ?? header?.returnAuthMsg ?? "").trim();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  // ===================================================================
  // 🔥 중요: API 라우트를 가장 먼저 정의 (정적 파일보다 우선)
  // ===================================================================

  app.get("/api/health", (req, res) => {
    const configExists = fs.existsSync(
      path.join(process.cwd(), "firebase-applet-config.json")
    );
    const busKey = process.env.BUSAN_BUS_API_KEY || "";

    res.json({
      status: "ok",
      busKey: !!busKey,
      busKeyLength: busKey.length,
      busKeyFirst10: busKey ? busKey.substring(0, 10) + "..." : "N/A",
      busKeyHasPlus: busKey.includes('+'),
      busKeyHasSlash: busKey.includes('/'),
      busKeyHasEquals: busKey.includes('='),
      mapsKey: !!process.env.GOOGLE_MAPS_API_KEY,
      mapsKeyLength: (process.env.GOOGLE_MAPS_API_KEY || "").length,
      firebaseConfig: configExists,
      nodeEnv: process.env.NODE_ENV || "development",
      geminiKey: !!process.env.GEMINI_API_KEY,
      appUrl: process.env.APP_URL || "N/A",
    });
  });

  app.get("/api/bus/route-list", async (req, res) => {
    try {
      const lineNo = getFirstQueryValue(req.query.lineNo);

      if (!lineNo) {
        return res.status(400).json({ error: "노선 번호가 필요합니다." });
      }

      const data = await callBusApi(
        "getBusRouteList",
        { lineNo },
        "BusanBmsService"
      );

      const routes = normalizeRoutes(data);
      return res.json({ routes });
    } catch (error: any) {
      return handleApiError(res, error, "노선 목록 조회 실패");
    }
  });

  app.get("/api/bus/location", async (req, res) => {
    try {
      const lineId = getFirstQueryValue(req.query.lineId);

      if (!lineId) {
        return res.status(400).json({ error: "노선 ID가 필요합니다." });
      }

      const data = await callBusApi(
        "busInfoByRouteId",
        { lineid: lineId },
        "BusanBmsService"
      );

      const locations = normalizeLocations(data);
      return res.json({ locations });
    } catch (error: any) {
      return handleApiError(res, error, "위치 정보 조회 실패");
    }
  });

  app.get("/api/bus/arrival", async (req, res) => {
    try {
      const stopId = getFirstQueryValue(req.query.stopId);

      if (!stopId) {
        return res.status(400).json({ error: "정류소 ID가 필요합니다." });
      }

      const data = await callBusApi(
        "stopArrByBstopid",
        { bstopid: stopId },
        "BusanBmsService"
      );

      const arrivals = normalizeArrivals(data);
      return res.json({ arrivals });
    } catch (error: any) {
      return handleApiError(res, error, "도착 정보 조회 실패");
    }
  });

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

  app.get("/api/maps-key", (req, res) => {
    const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;

    if (!MAPS_KEY) {
      return res.status(500).json({
        error: "Google Maps API 키가 설정되지 않았습니다.",
      });
    }

    return res.json({ key: MAPS_KEY });
  });

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

      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/directions/json",
        {
          params: {
            origin,
            destination,
            mode: "transit",
            transit_mode: "bus|subway",
            key: MAPS_KEY,
            language: "ko",
            region: "kr",
          },
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