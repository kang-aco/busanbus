"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusArrival } from "@/lib/bus-api/types";

interface StopInfo { seq: number; name: string; nodeId: string; }

/** lineId → 전체 정류소 배열 캐시 */
const stopsCache = new Map<string, StopInfo[]>();

async function fetchRouteStops(lineId: string): Promise<StopInfo[]> {
  if (!lineId) return [];
  if (stopsCache.has(lineId)) return stopsCache.get(lineId)!;
  try {
    const res = await fetch(`/api/bus/route-stops?lineId=${encodeURIComponent(lineId)}`);
    const data = await res.json();
    const stops: StopInfo[] = (data.stops ?? []).sort((a: StopInfo, b: StopInfo) => a.seq - b.seq);
    stopsCache.set(lineId, stops);
    return stops;
  } catch {
    return [];
  }
}

function resolveNames(
  station1: string,
  stops: StopInfo[]
): { direction: string; nextStop: string; terminalStart: string; terminalEnd: string } {
  const terminalStart = stops[0]?.name ?? "";
  const terminalEnd   = stops[stops.length - 1]?.name ?? "";

  // station1이 이름 형태면 그대로 방면으로 사용
  if (station1 && !/^\d+$/.test(station1)) {
    return {
      direction: station1.endsWith("방면") ? station1 : `${station1} 방면`,
      nextStop: station1,
      terminalStart,
      terminalEnd,
    };
  }

  // station1이 숫자(nodeId)면 정류소 이름 조회
  const matched = stops.find((s) => s.nodeId === station1);
  const nextStop = matched?.name ?? "";

  // 방면: 매칭된 정류소가 앞쪽이면 종점 방면, 뒤쪽이면 기점 방면
  let direction = terminalEnd ? `${terminalEnd} 방면` : "";
  if (matched && terminalStart) {
    const midSeq = stops.length > 0 ? stops[Math.floor(stops.length / 2)].seq : 0;
    direction = matched.seq <= midSeq
      ? `${terminalEnd} 방면`
      : `${terminalStart} 방면`;
  }

  return { direction, nextStop, terminalStart, terminalEnd };
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

      // 고유 lineId 별 전체 정류소 병렬 조회
      const uniqueLineIds = [...new Set(raw.map((a) => a.lineId).filter(Boolean))] as string[];
      const stopsResults = await Promise.all(
        uniqueLineIds.map((lid) => fetchRouteStops(lid).then((s) => [lid, s] as const))
      );
      const stopsMap = new Map(stopsResults);

      const enriched: BusArrival[] = raw.map((a) => {
        const stops = a.lineId ? (stopsMap.get(a.lineId) ?? []) : [];
        const resolved = resolveNames(a.station1 ?? "", stops);
        return { ...a, ...resolved };
      });

      if (requestId === requestIdRef.current) {
        setArrivals((prev) =>
          JSON.stringify(prev) === JSON.stringify(enriched) ? prev : enriched
        );
      }
    } catch (err: any) {
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
