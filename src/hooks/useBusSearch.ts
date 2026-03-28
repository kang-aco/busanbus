import { useState } from "react";
import type { BusRoute } from "@/lib/bus-api/types";

export function useBusSearch() {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchBus = async (lineNo: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bus/route-list?lineNo=${lineNo}`);
      const data = await response.json();

      if (data.error) {
        setError(`검색 실패: ${data.error}`);
        setRoutes([]);
      } else {
        setRoutes(data.routes || []);
        if (!data.routes || data.routes.length === 0) {
          setError("검색 결과가 없습니다.");
        }
      }
    } catch (err: any) {
      setError(`검색 실패: ${err.message}`);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  return { routes, loading, error, searchBus };
}