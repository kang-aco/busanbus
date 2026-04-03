"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusLocation } from "@/lib/bus-api/types";

export function useBusLocations(lineId: string | null) {
  const [locations, setLocations] = useState<BusLocation[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestIdRef = useRef(0);

  const fetchLocations = useCallback(async () => {
    if (!lineId) return;

    const requestId = ++requestIdRef.current;
    setLocationLoading(true);
    setLocationError(null);

    try {
      const res = await fetch(`/api/bus/location?lineId=${encodeURIComponent(lineId)}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "버스 위치 조회 실패");
      }

      const list = Array.isArray(data?.locations) ? data.locations : [];

      if (requestId === requestIdRef.current) {
        // Only update state when data actually changed to prevent unnecessary re-renders
        setLocations((prev) =>
          JSON.stringify(prev) === JSON.stringify(list) ? prev : list
        );
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      console.error("[Location Error]:", err);
      if (requestId === requestIdRef.current) {
        setLocations([]);
        setLocationError(err?.message || "버스 위치 조회 중 오류가 발생했습니다.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLocationLoading(false);
      }
    }
  }, [lineId]);

  useEffect(() => {
    if (!lineId) {
      setLocations([]);
      setLastUpdated(null);
      return;
    }

    fetchLocations();
    const timer = setInterval(fetchLocations, 30000);
    return () => clearInterval(timer);
  }, [lineId, fetchLocations]);

  return {
    locations,
    locationLoading,
    locationError,
    lastUpdated,
    refreshLocations: fetchLocations,
  };
}
