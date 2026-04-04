"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusArrival } from "@/lib/bus-api/types";

/** lineId → { startName, endName } 캐시 (세션 내 재사용) */
const terminalCache = new Map<string, { startName: string; endName: string }>();

async function fetchTerminalNames(lineId: string): Promise<{ startName: string; endName: string } | null> {
  if (!lineId) return null;
  if (terminalCache.has(lineId)) return terminalCache.get(lineId)!;

  try {
    const res = await fetch(`/api/bus/route-stops?lineId=${encodeURIComponent(lineId)}`);
    const data = await res.json();
    const stops: { seq: number; name: string }[] = data.stops ?? [];
    if (stops.length < 2) return null;

    const sorted = [...stops].sort((a, b) => a.seq - b.seq);
    const result = {
      startName: sorted[0].name,
      endName: sorted[sorted.length - 1].name,
    };
    terminalCache.set(lineId, result);
    return result;
  } catch {
    return null;
  }
}

/**
 * station1이 순수 숫자(정류소 ID)인지 판단.
 * 이름이면 그대로 "방면" 붙여 반환, 숫자면 terminalNames로 대체.
 */
function buildDirection(
  station1: string,
  terminals: { startName: string; endName: string } | null
): string {
  if (!station1 && !terminals) return "";

  // station1이 이름 형태면 그대로 사용
  if (station1 && !/^\d+$/.test(station1)) {
    return station1.endsWith("방면") ? station1 : `${station1} 방면`;
  }

  // station1이 숫자(정류소ID)거나 없으면 → 종점 이름 사용
  if (terminals) {
    return `${terminals.endName} 방면`;
  }

  return "";
}

export function useBusArrivals(stopId: string | null) {
  const [arrivals, setArrivals] = useState<BusArrival[]>([]);
  const [arrivalLoading, setArrivalLoading] = useState(false);
  const [arrivalError, setArrivalError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchArrivals = useCallback(async () => {
    if (!stopId) return;

    const requestId = ++requestIdRef.current;
    setArrivalLoading(true);
    setArrivalError(null);

    try {
      const res = await fetch(`/api/bus/arrival?stopId=${encodeURIComponent(stopId)}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || data?.error || "도착 정보 조회 실패");

      const raw: BusArrival[] = Array.isArray(data?.arrivals) ? data.arrivals : [];

      // 고유 lineId 별로 터미널 이름 병렬 조회
      const uniqueLineIds = [...new Set(raw.map((a) => a.lineId).filter(Boolean))] as string[];
      const terminalResults = await Promise.all(
        uniqueLineIds.map((lid) => fetchTerminalNames(lid).then((t) => [lid, t] as const))
      );
      const terminalMap = new Map(terminalResults);

      const enriched: BusArrival[] = raw.map((a) => {
        const terminals = a.lineId ? (terminalMap.get(a.lineId) ?? null) : null;
        return {
          ...a,
          direction:     buildDirection(a.station1 ?? "", terminals),
          terminalStart: terminals?.startName ?? "",
          terminalEnd:   terminals?.endName   ?? "",
        };
      });

      if (requestId === requestIdRef.current) {
        setArrivals((prev) =>
          JSON.stringify(prev) === JSON.stringify(enriched) ? prev : enriched
        );
      }
    } catch (err: any) {
      console.error("[Arrival Error]:", err);
      if (requestId === requestIdRef.current) {
        setArrivals([]);
        setArrivalError(err?.message || "도착 정보 조회 중 오류가 발생했습니다.");
      }
    } finally {
      if (requestId === requestIdRef.current) setArrivalLoading(false);
    }
  }, [stopId]);

  useEffect(() => {
    if (!stopId) { setArrivals([]); return; }
    fetchArrivals();
    const timer = setInterval(fetchArrivals, 30000);
    return () => clearInterval(timer);
  }, [stopId, fetchArrivals]);

  return { arrivals, arrivalLoading, arrivalError, refreshArrivals: fetchArrivals };
}
