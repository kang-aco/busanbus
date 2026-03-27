import { NormalizedApiError, PublicApiHeader } from "./types";

const SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY;

function getRequiredEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  }
  return value;
}

export function buildPublicDataUrl(baseUrl: string, params: Record<string, string>) {
  const serviceKey = getRequiredEnv("DATA_GO_KR_SERVICE_KEY", SERVICE_KEY);

  const url = new URL(baseUrl);

  // 핵심: 원본 키를 환경변수에 저장하고, URLSearchParams가 1회만 인코딩하게 둡니다.
  // encodeURIComponent(serviceKey)를 다시 호출하지 않습니다.
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("_type", "json");

  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export function extractHeader(data: any): PublicApiHeader {
  return data?.response?.header || data?.header || data?.cmmMsgHeader || {};
}

export function isApiSuccess(data: any) {
  const header = extractHeader(data);
  const code = String(
    header?.resultCode ?? header?.returnReasonCode ?? ""
  ).trim();

  return code === "" || code === "0" || code === "00";
}

export function normalizeApiError(data: any, fallback = "공공데이터 API 호출 실패"): NormalizedApiError {
  const header = extractHeader(data);
  const code = String(
    header?.resultCode ?? header?.returnReasonCode ?? ""
  ).trim();
  const message = String(
    header?.resultMsg ?? header?.returnAuthMsg ?? ""
  ).trim();

  return {
    error: fallback,
    code: code || undefined,
    message: message || fallback,
    details: data,
  };
}

export async function fetchPublicJson(baseUrl: string, params: Record<string, string>) {
  const url = buildPublicDataUrl(baseUrl, params);

  const res = await fetch(url, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status}`);
  }

  return res.json();
}
