import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";
import { XMLParser } from "fast-xml-parser";

dotenv.config();

const xmlParser = new XMLParser();

function parseXmlToJson(xmlData: string) {
  try {
    const jsonObj = xmlParser.parse(xmlData);
    // 공공데이터포털 XML 구조를 JSON 구조와 유사하게 반환
    return jsonObj;
  } catch (e) {
    console.error("[XML Parse Error]:", e);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    const configExists = fs.existsSync(path.join(process.cwd(), 'firebase-applet-config.json'));
    res.json({ 
      status: "ok", 
      busKey: !!process.env.BUSAN_BUS_API_KEY,
      mapsKey: !!process.env.GOOGLE_MAPS_API_KEY,
      firebaseConfig: configExists
    });
  });

  // Busan Bus API Proxy (Official Gateway)
  const BUSAN_API_BASE = "http://apis.data.go.kr/6260000/BusanBmsService";

  /**
   * 공공데이터포털 API 호출 통합 헬퍼 (사용자 최종 제안 반영)
   * - 사용자 제안에 따라 URL을 직접 조합하고 응답을 텍스트로 먼저 받아 처리합니다.
   */
  async function callBusApi(endpoint: string, params: any) {
    // 사용자가 제공한 인코딩된 키 원문 (특수문자 포함)
    const SERVICE_KEY = process.env.BUSAN_BUS_API_KEY || "UB2k8EMVzmIHj%2B%2BX7CsOOB0xhew3KzZQcK%2B2djXsW%2BJIWzVxTRkErCFMI3ZwkV58bu%2BaAW3q974GzlqxNC6kxw%3D%3D";
    
    const baseUrl = `http://apis.data.go.kr/6260000/BusanBmsService/${endpoint}`;
    
    // 나머지 파라미터 구성
    const queryObj: any = { ...params, _type: 'json' };
    const queryParams = Object.entries(queryObj)
      .map(([key, val]) => `${key}=${encodeURIComponent(String(val))}`)
      .join('&');

    // 최종 URL 조합: serviceKey는 원문 그대로(이미 인코딩된 상태일 수 있음) 주입
    const fullUrl = `${baseUrl}?serviceKey=${SERVICE_KEY}&${queryParams}`;
    
    console.log(`[Bus API] Requesting: ${fullUrl}`);

    try {
      const response = await axios.get(fullUrl, { 
        timeout: 15000,
        headers: { 
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://busanbus.pages.dev/'
        },
        // 공공데이터포털의 불안정한 형식을 처리하기 위해 응답을 텍스트로 먼저 받음
        responseType: 'text',
        validateStatus: () => true
      });
      
      let rawData = response.data;
      let data: any;

      // 텍스트 데이터를 JSON 또는 XML로 파싱
      if (typeof rawData === 'string') {
        const trimmedData = rawData.trim();
        
        // 1. JSON 시도
        try {
          data = JSON.parse(trimmedData);
        } catch (e) {
          // 2. XML 시도 (JSON 파싱 실패 시)
          if (trimmedData.includes('<response>') || trimmedData.includes('<cmmMsgHeader>')) {
            data = parseXmlToJson(trimmedData);
          } else {
            // 3. 게이트웨이 에러 메시지 확인
            if (trimmedData.includes("Unexpected errors") || 
                trimmedData.includes("SERVICE_KEY_IS_NOT_REGISTERED") || 
                trimmedData.includes("INVALID_REQUEST_PARAMETER_ERROR")) {
              const error = new Error("API_AUTH_ERROR");
              (error as any).details = trimmedData;
              throw error;
            }
            throw new Error(`알 수 없는 응답 형식: ${trimmedData.substring(0, 100)}`);
          }
        }
      } else {
        data = rawData;
      }

      // API 비즈니스 로직 레벨의 에러 체크
      const header = data?.response?.header || data?.header || data?.cmmMsgHeader;
      if (header) {
        const resultCode = String(header.resultCode || header.returnReasonCode || "");
        if (resultCode !== "00" && resultCode !== "0" && resultCode !== "") {
          const error = new Error("API_BUSINESS_ERROR");
          (error as any).code = resultCode;
          (error as any).details = header.resultMsg || header.returnAuthMsg || "알 수 없는 API 에러";
          throw error;
        }
      }
      
      if (!data) throw new Error("EMPTY_RESPONSE");
      return data;
    } catch (err: any) {
      console.error(`[Bus API] Error: ${err.message}`);
      throw err;
    }
  }


  /**
   * API 에러 응답을 처리하는 헬퍼 함수
   */
  function handleApiError(res: express.Response, error: any, defaultMessage: string) {
    console.error(`[API Error] ${defaultMessage}:`, error.message, error.details || "");
    
    if (error.message === "API_AUTH_ERROR") {
      const isUnexpected = error.details && error.details.includes("Unexpected errors");
      return res.status(401).json({
        error: isUnexpected ? "API 인증 실패 (Unexpected errors)" : "API 인증 실패",
        details: isUnexpected 
          ? "공공데이터포털에서 'Unexpected errors'가 발생했습니다. 이는 주로 API 키의 특수문자(+, / 등) 처리 문제일 가능성이 높습니다."
          : "API 키가 유효하지 않거나 만료되었을 수 있습니다. .env 파일(또는 Secrets)과 공공데이터포털 설정을 확인해 주세요.",
        suggestion: isUnexpected 
          ? "디코딩 키를 사용 중이라면 서버 코드에서 encodeURIComponent 처리가 필요하며, 인코딩 키를 사용 중이라면 원문 그대로 사용해야 합니다. 현재 서버는 키를 인코딩하여 보내고 있습니다."
          : "키 발급 후 동기화까지 최대 24시간이 소요될 수 있습니다.",
        apiDetails: error.details
      });
    }

    res.status(500).json({ 
      error: defaultMessage, 
      details: error.message,
      apiDetails: error.details
    });
  }

  app.get("/api/bus/route-list", async (req, res) => {
    try {
      const { lineNo } = req.query;
      if (!lineNo) return res.status(400).json({ error: "노선 번호가 필요합니다." });

      const data = await callBusApi('getBusRouteList', { lineNo });
      res.json(data);
    } catch (error: any) {
      handleApiError(res, error, "노선 목록 조회 실패");
    }
  });

  app.get("/api/bus/location", async (req, res) => {
    try {
      const { lineId } = req.query;
      if (!lineId) return res.status(400).json({ error: "노선 ID가 필요합니다." });

      const data = await callBusApi('getBusRouteLocation', { lineid: lineId });
      res.json(data);
    } catch (error: any) {
      handleApiError(res, error, "위치 정보 조회 실패");
    }
  });

  app.get("/api/bus/arrival", async (req, res) => {
    try {
      const { stopId } = req.query;
      if (!stopId) return res.status(400).json({ error: "정류소 ID가 필요합니다." });

      // 사용자 제안에 따라 getBusArrivalItem 엔드포인트와 stopId 파라미터를 사용합니다.
      const data = await callBusApi('getBusArrivalItem', { stopId: stopId });
      res.json(data);
    } catch (error: any) {
      handleApiError(res, error, "도착 정보 조회 실패");
    }
  });

  // Google Maps API Key Proxy
  app.get("/api/maps-key", (req, res) => {
    const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!MAPS_KEY) {
      return res.status(500).json({ error: "Google Maps API 키가 설정되지 않았습니다." });
    }
    res.json({ key: MAPS_KEY });
  });

  // Google Maps Directions Proxy
  app.get("/api/directions", async (req, res) => {
    const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!MAPS_KEY) {
      return res.status(500).json({ 
        error: "Google Maps API 키가 설정되지 않았습니다.", 
        details: "Secrets에서 GOOGLE_MAPS_API_KEY를 설정해 주세요. (Directions API 활성화 필요)" 
      });
    }

    try {
      let { origin, destination } = req.query as { origin: string, destination: string };
      
      // 부산이 포함되어 있지 않으면 자동으로 추가
      if (!origin.includes("부산")) origin = `부산 ${origin}`;
      if (!destination.includes("부산")) destination = `부산 ${destination}`;

      console.log(`Searching route: ${origin} -> ${destination}`);
      const response = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
        params: {
          origin,
          destination,
          mode: "transit",
          transit_mode: "bus|subway",
          key: MAPS_KEY,
          language: "ko",
          region: "kr"
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Directions Error:", error.response?.data || error.message);
      res.status(500).json({ error: "경로를 찾을 수 없습니다.", details: error.message });
    }
  });

  // Catch-all for undefined API routes to prevent Vite fallback (HTML)
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API 엔드포인트를 찾을 수 없습니다.", path: req.path });
  });

  // Vite middleware for development
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

startServer();
