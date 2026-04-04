import { useState, useEffect } from "react";

export interface RouteStop {
  seq: number;
  name: string;
  nodeId: string;
  lat: number;
  lng: number;
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
