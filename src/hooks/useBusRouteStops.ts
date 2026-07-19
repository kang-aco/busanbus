import { useState, useEffect } from "react";

export interface RouteStop {
  seq: number;
  name: string;
  nodeId: string;
  bstopid?: string;
  arsno?: string;
  bus?: string;      // 이 정류소에 현재 위치한 버스 차량번호 (있을 때만)
  rpoint?: string;   // 회차지 등 구분
  lat?: number;      // 버스가 있는 정류소에만 좌표가 채워짐
  lng?: number;
}

export function useBusRouteStops(lineId: string | null) {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lineId) { setStops([]); return; }

    setLoading(true);
    fetch(`/api/bus/route-stops?lineId=${encodeURIComponent(lineId)}`)
      .then((r) => r.json())
      .then((data) => setStops(data.stops ?? []))
      .catch(() => setStops([]))
      .finally(() => setLoading(false));
  }, [lineId]);

  return { stops, loading };
}
