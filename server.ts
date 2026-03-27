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

  /**
   * 공공데이터포털 API 호출 공통 헬퍼
   *
   * 핵심 원칙:
   * - BUSAN_BUS_API_KEY는 환경변수에 한 종류로만 넣습니다.
   * - 여기서는 encodeURIComponent(serviceKey)를 절대 하지 않습니다.
   * - URLSearchParams가 최종적으로 1회만 처리하게 둡니다.
   */
  async function callBusApi(
    endpoint: string,
    params: Record<string, unknown>,
    service: string = "BusanBmsService"
  ) {
    const serviceKey = process.env.BUSAN_BUS_API_KEY || "";

    if (!serviceKey) {
      const error = new Error("MISSING_SERVICE_KEY");
      throw error;
    }

    const url = new URL(`https://apis.data.go.kr/6260000/${service}/${endpoint}`);
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("_type", "json");

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;

      const normalizedValue = Array.isArray(value)
        ? String(value[0] ?? "").trim()
        : String(value).trim();

      if (!normalizedValue) continue;
      url.searchParams.set(key, normalizedValue);
    }

    const safeUrlForLog = maskSecretInText(url.toString(), serviceKey);
    console.log(`[Bus API] Requesting (${service}): ${safeUrlForLog}`);

    try {
      const response = await axios.get(url.toString(), {
        timeout: 15000,
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0",
          Referer: "https://busanbus.pages.dev/",
        },
        responseType: "text",
        validateStatus: () => true,
      });

      const rawData = response.data;
      const trimmedData =
        typeof rawData === "string" ? rawData.trim() : rawData;

      console.log(`[Bus API] HTTP ${response.status} / ${endpoint}`);

      if (typeof trimmedData === "string") {
        console.log(
          `[Bus API] Raw Response: ${maskSecretInText(
            trimmedData.substring(0, 700),
            serviceKey
          )}`
        );
      }

      let data: any = null;

      if (typeof trimmedData === "string") {
        try {
          data = JSON.parse(trimmedData);
        } catch {
          if (
            trimmedData.includes("<response>") ||
            trimmedData.includes("<cmmMsgHeader>") ||
            trimmedData.includes("<?xml")
          ) {
            data = parseXmlToJson(trimmedData);
          } else {
            if (
              trimmedData.includes("Unexpected errors") ||
              trimmedData.includes("SERVICE KEY IS NOT REGISTERED") ||
              trimmedData.includes("SERVICE_KEY_IS_NOT_REGISTERED")
            ) {
              const error = new Error("API_AUTH_ERROR");
              (error as any).details = trimmedData;
              throw error;
            }

            const error = new Error("UNKNOWN_API_RESPONSE");
            (error as any).details = trimmedData.substring(0, 500);
            throw error;
          }
        }
      } else {
        data = trimmedData;
      }

      if (!data) {
        const error = new Error("EMPTY_RESPONSE");
        throw error;
      }

      const header = getHeader(data);
      const resultCode = getResultCode(header);
      const resultMsg = getResultMessage(header);

      if (response.status >= 400) {
        const error = new Error("API_HTTP_ERROR");
        (error as any).code = String(response.status);
        (error as any).details =
          resultMsg || JSON.stringify(data).substring(0, 500);
        throw error;
      }

      if (resultCode && resultCode !== "00" && resultCode !== "0") {
        const error = new Error("API_BUSINESS_ERROR");
        (error as any).code = resultCode;
        (error as any).details = resultMsg || "알 수 없는 API 에러";
        throw error;
      }

      console.log(
        `[Bus API] Parsed Response for ${endpoint}:`,
        maskSecretInText(JSON.stringify(data).substring(0, 700), serviceKey)
      );

      return data;
    } catch (err: any) {
      console.error(
        `[Bus API] Error (${endpoint}):`,
        err?.message,
        err?.details || ""
      );
      throw err;
    }
  }

  function handleApiError(
    res: express.Response,
    error: any,
    defaultMessage: string
  ) {
    console.error(
      `[API Error] ${defaultMessage}:`,
      error?.message,
      error?.details || ""
    );

    if (error?.message === "MISSING_SERVICE_KEY") {
      return res.status(500).json({
        error: "서버 설정 오류",
        details: "BUSAN_BUS_API_KEY가 설정되지 않았습니다.",
      });
    }

    if (error?.message === "API_AUTH_ERROR") {
      const details =
        typeof error?.details === "string" ? error.details : "";
      const isUnexpected = details.includes("Unexpected errors");

      return res.status(401).json({
        error: isUnexpected ? "API 인증 실패 (Unexpected errors)" : "API 인증 실패",
        details: isUnexpected
          ? "공공데이터포털 인증 과정에서 'Unexpected errors'가 발생했습니다. serviceKey 전달 방식 문제보다는 서비스명, 엔드포인트, 활용신청 승인 상태를 먼저 확인해야 합니다."
          : "API 키가 유효하지 않거나 등록되지 않았을 수 있습니다.",
        suggestion:
          "BusanBmsService 기준으로 서비스명을 통일하고, data.go.kr에서 해당 API 활용신청이 승인 완료인지 확인하세요.",
        apiDetails: error?.details,
      });
    }

    if (error?.message === "API_HTTP_ERROR") {
      return res.status(502).json({
        error: defaultMessage,
        details: `공공데이터 HTTP 오류: ${error?.code || "unknown"}`,
        apiDetails: error?.details,
      });
    }

    if (error?.message === "API_BUSINESS_ERROR") {
      return res.status(502).json({
        error: defaultMessage,
        code: error?.code,
        details: error?.details,
      });
    }

    if (error?.message === "UNKNOWN_API_RESPONSE") {
      return res.status(502).json({
        error: defaultMessage,
        details: "공공데이터 응답 형식을 해석하지 못했습니다.",
        apiDetails: error?.details,
      });
    }

    if (error?.message === "EMPTY_RESPONSE") {
      return res.status(502).json({
        error: defaultMessage,
        details: "공공데이터 응답이 비어 있습니다.",
      });
    }

    return res.status(500).json({
      error: defaultMessage,
      details: error?.message || "알 수 없는 오류",
      apiDetails: error?.details,
    });
  }

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

  app.all("/api/*", (req, res) => {
    res.status(404).json({
      error: "API 엔드포인트를 찾을 수 없습니다.",
      path: req.path,
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    app.use(express.static(distPath));
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