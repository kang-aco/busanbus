"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusArrival } from "@/lib/bus-api/types";

interface StopInfo { seq: number; name: string; nodeId: string; bstopid?: string; arsno?: string; }

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

  // station1이 ARS 번호 형태("ARS11129")면 숫자 부분 추출
  const arsNum = /^ARS(\d+)$/i.test(station1) ? station1.replace(/^ARS/i, "") : null;

  // station1이 이름 형태면 그대로 방면으로 사용 (단, ARS 형태는 제외)
  if (station1 && !/^\d+$/.test(station1) && !arsNum) {
    return {
      direction: station1.endsWith("방면") ? station1 : `${station1} 방면`,
      nextStop: station1,
      terminalStart,
      terminalEnd,
    };
  }

  // station1이 숫자(nodeId) 또는 ARS 번호면 정류소 이름 조회
  const matched = stops.find((s) =>
    s.nodeId === station1 ||
    s.bstopid === station1 ||
    (arsNum && (s.arsno === arsNum || s.nodeId === arsNum || s.bstopid === arsNum))
  );
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

/** 도착 예정 시각(분) 오름차순 정렬용 키 */
function min1Value(a: BusArrival): number {
  const n = parseInt(a.min1 ?? "", 10);
  return isNaN(n) ? 9999 : n;
}

/**
 * 정류소 도착정보.
 * 부산 API(stopArrByBstopid)는 "지금 접근 중인 버스가 있는 노선"만 반환하므로,
 * 선택한 정류소와 같은 위치의 인접 정류소(nearbyIds)까지 합쳐 더 많은 버스를 보여준다.
 * - 선택 정류소는 즉시 표시하고, 인접 정류소는 로드되는 대로 점진적으로 채운다.
 */
export function useBusArrivals(stopId: string | null, nearbyIds: string[] = []) {
  const [arrivals, setArrivals] = useState<BusArrival[]>([]);
  const [arrivalLoading, setArrivalLoading] = useState(false);
  const [arrivalError, setArrivalError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const firstLoadRef = useRef(true);

  const nearbyKey = nearbyIds.filter((id) => id && id !== stopId).join(",");

  // 선택 정류소/인접 목록이 바뀌면 첫 로딩(점진 표시)으로 리셋
  useEffect(() => {
    firstLoadRef.current = true;
  }, [stopId, nearbyKey]);

  const fetchArrivals = useCallback(async () => {
    if (!stopId) return;
    const requestId = ++requestIdRef.current;
    const progressive = firstLoadRef.current;
    firstLoadRef.current = false;

    setArrivalLoading(true);
    setArrivalError(null);

    const alive = () => requestId === requestIdRef.current;
    const nearby = nearbyKey ? nearbyKey.split(",").slice(0, 8) : [];

    // 노선별 방면/다음정류소 이름 붙이기 (route-stops 캐시 활용)
    const enrich = async (raw: BusArrival[]): Promise<BusArrival[]> => {
      const uniqueLineIds = [...new Set(raw.map((a) => a.lineId).filter(Boolean))] as string[];
      const stopsResults = await Promise.all(
        uniqueLineIds.map((lid) => fetchRouteStops(lid).then((s) => [lid, s] as const))
      );
      const stopsMap = new Map(stopsResults);
      return raw.map((a) => {
        const stops = a.lineId ? (stopsMap.get(a.lineId) ?? []) : [];
        return { ...a, ...resolveNames(a.station1 ?? "", stops) };
      });
    };

    const fetchOne = async (id: string): Promise<BusArrival[]> => {
      try {
        const res = await fetch(`/api/bus/arrival?stopId=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) return [];
        const raw: BusArrival[] = Array.isArray(data?.arrivals) ? data.arrivals : [];
        return raw.map((a) => ({ ...a, stopId: a.stopId || id }));
      } catch {
        return [];
      }
    };

    // 정류소+노선 단위로 중복 제거하며 누적 → 도착 임박순 정렬
    const accum = new Map<string, BusArrival>();
    const mergeAndSet = (items: BusArrival[]) => {
      for (const a of items) {
        accum.set(`${a.stopId}-${a.lineId || a.lineNo}`, a);
      }
      if (!alive()) return;
      const merged = [...accum.values()].sort((x, y) => min1Value(x) - min1Value(y));
      setArrivals((prev) =>
        JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged
      );
    };

    try {
      // 1) 선택 정류소 (오류는 여기서만 표면화)
      const res = await fetch(`/api/bus/arrival?stopId=${encodeURIComponent(stopId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "도착 정보 조회 실패");
      const primaryRaw: BusArrival[] = (Array.isArray(data?.arrivals) ? data.arrivals : []).map(
        (a: BusArrival) => ({ ...a, stopId: a.stopId || stopId })
      );
      const primary = await enrich(primaryRaw);
      if (!alive()) return;

      if (progressive) {
        // 선택 정류소 즉시 표시
        mergeAndSet(primary);
        setArrivalLoading(false);
        // 인접 정류소는 로드되는 대로 채움
        await Promise.all(
          nearby.map(async (id) => {
            const items = await fetchOne(id);
            if (!alive()) return;
            const e = await enrich(items);
            if (!alive()) return;
            mergeAndSet(e);
          })
        );
      } else {
        // 갱신(30초)에서는 깜빡임 없이 한 번에 반영
        const nearbyItems = (await Promise.all(nearby.map(fetchOne))).flat();
        if (!alive()) return;
        const nearbyEnriched = await enrich(nearbyItems);
        if (!alive()) return;
        mergeAndSet(primary);
        mergeAndSet(nearbyEnriched);
      }
    } catch (err: any) {
      if (alive()) {
        setArrivals([]);
        setArrivalError(err?.message || "도착 정보 조회 중 오류가 발생했습니다.");
      }
    } finally {
      if (alive()) setArrivalLoading(false);
    }
  }, [stopId, nearbyKey]);

  useEffect(() => {
    if (!stopId) { setArrivals([]); return; }
    fetchArrivals();
    const timer = setInterval(fetchArrivals, 30000);
    return () => clearInterval(timer);
  }, [stopId, nearbyKey, fetchArrivals]);

  return { arrivals, arrivalLoading, arrivalError, refreshArrivals: fetchArrivals };
}
