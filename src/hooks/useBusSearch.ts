import { useState } from "react";
import type { BusRoute } from "@/lib/bus-api/types";

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
    const result = { startName: sorted[0].name, endName: sorted[sorted.length - 1].name };
    terminalCache.set(lineId, result);
    return result;
  } catch {
    return null;
  }
}

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
        return;
      }

      const raw: BusRoute[] = data.routes ?? [];
      if (raw.length === 0) {
        setError("검색 결과가 없습니다.");
        setRoutes([]);
        return;
      }

      // 기점·종점 이름 병렬 조회
      const terminalResults = await Promise.all(
        raw.map((r) =>
          fetchTerminalNames(r.lineId).then((t) => [r.lineId, t] as const)
        )
      );
      const terminalMap = new Map(terminalResults);

      const enriched: BusRoute[] = raw.map((r) => {
        const t = terminalMap.get(r.lineId);
        return {
          ...r,
          terminalStart: t?.startName ?? "",
          terminalEnd:   t?.endName   ?? "",
        };
      });

      setRoutes(enriched);
    } catch (err: any) {
      setError(`검색 실패: ${err.message}`);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  return { routes, loading, error, searchBus };
}
