"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusArrival } from "@/lib/bus-api/types";

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

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "도착 정보 조회 실패");
      }

      const list = Array.isArray(data?.arrivals) ? data.arrivals : [];

      if (requestId === requestIdRef.current) {
        setArrivals(list);
      }
    } catch (err: any) {
      console.error("[Arrival Error]:", err);
      if (requestId === requestIdRef.current) {
        setArrivals([]);
        setArrivalError(err?.message || "도착 정보 조회 중 오류가 발생했습니다.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setArrivalLoading(false);
      }
    }
  }, [stopId]);

  useEffect(() => {
    if (!stopId) {
      setArrivals([]);
      return;
    }

    fetchArrivals();
    const timer = setInterval(fetchArrivals, 30000);
    return () => clearInterval(timer);
  }, [stopId, fetchArrivals]);

  return {
    arrivals,
    arrivalLoading,
    arrivalError,
    refreshArrivals: fetchArrivals,
  };
}