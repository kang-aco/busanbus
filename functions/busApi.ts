import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import express from "express";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
});

export function parseXmlToJson(xmlData: string) {
  try {
    return xmlParser.parse(xmlData);
  } catch (e) {
    console.error("[XML Parse Error]:", e);
    return null;
  }
}

export function maskSecretInText(text: string, secret: string) {
  if (!secret) return text;
  return text.split(secret).join("***MASKED***");
}

export function getHeader(data: any) {
  return data?.response?.header || data?.header || data?.cmmMsgHeader || {};
}

export function getResultCode(header: any) {
  return String(header?.resultCode ?? header?.returnReasonCode ?? "").trim();
}

export function getResultMessage(header: any) {
  return String(header?.resultMsg ?? header?.returnAuthMsg ?? "").trim();
}

export function getFirstQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? "").trim();
  }
  return String(value ?? "").trim();
}

/**
 * 공공데이터포털 API 호출 공통 헬퍼
 */
export async function callBusApi(
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

export function handleApiError(
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
