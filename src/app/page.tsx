"use client";

import { useMemo, useState } from "react";
import { BusSearchPanel } from "@/components/bus/BusSearchPanel";
import { RouteList } from "@/components/bus/RouteList";
import { RouteDetailPanel } from "@/components/bus/RouteDetailPanel";
import { ArrivalPanel } from "@/components/bus/ArrivalPanel";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { useBusSearch } from "@/hooks/useBusSearch";
import { useBusLocations } from "@/hooks/useBusLocations";
import { useBusArrivals } from "@/hooks/useBusArrivals";
import type { BusRoute } from "@/lib/bus-api/types";

export default function Page() {
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const { searchQuery, setSearchQuery, routes, searchLoading, searchError, searchBus } = useBusSearch();
  const { locations, locationLoading, locationError } = useBusLocations(selectedRoute?.lineId ?? null);
  const { arrivals, arrivalLoading, arrivalError } = useBusArrivals(selectedStopId);

  const mergedError = useMemo(() => {
    return searchError || locationError || arrivalError || null;
  }, [searchError, locationError, arrivalError]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-4 bg-gray-50 p-4">
      <h1 className="text-2xl font-bold">부산 버스 라이브</h1>

      <BusSearchPanel
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={searchBus}
        loading={searchLoading}
      />

      <ErrorBanner message={mergedError} />

      {searchLoading ? (
        <p className="text-center py-10 text-gray-500">노선 검색 중...</p>
      ) : (
        <RouteList
          routes={routes}
          selectedRouteId={selectedRoute?.lineId ?? null}
          onSelect={(route) => {
            setSelectedRoute(route);
            setSelectedStopId(null);
          }}
        />
      )}

      {locationLoading && <p>버스 위치 불러오는 중...</p>}
      <RouteDetailPanel route={selectedRoute} locations={locations} />

      {selectedRoute && (
        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">도착 조회용 정류소 ID 입력</h2>
          <div className="flex gap-2">
            <input
              placeholder="예: 123456"
              className="flex-1 rounded-2xl border px-4 py-3 outline-none"
              onChange={(e) => setSelectedStopId(e.target.value || null)}
            />
          </div>
        </div>
      )}

      {arrivalLoading && <p>도착 정보 불러오는 중...</p>}
      <ArrivalPanel arrivals={arrivals} />
    </main>
  );
}