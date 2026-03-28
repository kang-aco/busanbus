"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import BusSearchPanel from "@/components/bus/BusSearchPanel";
import RouteList from "@/components/bus/RouteList";
import RouteDetailPanel from "@/components/bus/RouteDetailPanel";
import ArrivalPanel from "@/components/bus/ArrivalPanel";
import BusMap from "@/components/bus/BusMap";
import StopSearchPanel from "@/components/bus/StopSearchPanel";
import { useBusSearch } from "@/hooks/useBusSearch";
import { useBusLocations } from "@/hooks/useBusLocations";
import { useBusArrivals } from "@/hooks/useBusArrivals";
import { useFavorites } from "@/hooks/useFavorites";
import type { BusRoute } from "@/lib/bus-api/types";

export default function Home() {
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedStopName, setSelectedStopName] = useState<string | null>(null);
  const [showStopSearch, setShowStopSearch] = useState(false);

  const { routes = [], loading = false, error = null, searchBus } = useBusSearch();
  const { locations: busLocations = [], locationLoading, locationError } = useBusLocations(selectedRoute?.lineId || null);
  const { arrivals = [], arrivalLoading, arrivalError } = useBusArrivals(selectedStopId);
  const { favorites = [], toggleFavorite } = useFavorites();

  const isFavorite = (lineId: string) => favorites.includes(lineId);

  const handleSearch = (lineNo: string) => {
    if (searchBus) {
      searchBus(lineNo);
    }
    setSelectedRoute(null);
  };

  const handleRouteSelect = (route: BusRoute) => {
    setSelectedRoute(route);
    setSelectedStopId(null);
    setSelectedStopName(null);
    setShowStopSearch(false);
  };

  const handleStopSelect = (stopId: string, stopName: string) => {
    setSelectedStopId(stopId);
    setSelectedStopName(stopName);
    setShowStopSearch(false);
    setSelectedRoute(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">부산 버스 라이브</h1>
          <p className="text-gray-600 mt-2">실시간 버스 위치 및 도착 정보를 확인하세요</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 버스 노선 검색 */}
          <div className="space-y-6">
            <BusSearchPanel
              onSearch={handleSearch}
              onRouteSelect={handleRouteSelect}
              routes={routes}
              loading={loading}
              error={error}
            />

            {routes.length > 0 && !selectedRoute && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <RouteList
                  routes={routes}
                  selectedRouteId={selectedRoute?.lineId ?? null}
                  onSelect={handleRouteSelect}
                  isFavorite={isFavorite}
                  onToggleFavorite={(route) => toggleFavorite(route.lineId)}
                />
              </div>
            )}

            {selectedRoute && (
              <div className="space-y-6">
                {locationLoading && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    버스 위치 정보를 불러오는 중...
                  </div>
                )}
                
                {locationError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {locationError}
                  </div>
                )}
                
                <RouteDetailPanel
                  route={selectedRoute}
                  locations={busLocations}
                />
              </div>
            )}
          </div>

          {/* 오른쪽: 정류소 검색 + 도착 정보 + 지도 */}
          <div className="space-y-6">
            {/* 정류소 검색 토글 버튼 */}
            <button
              onClick={() => setShowStopSearch(!showStopSearch)}
              className="w-full p-4 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors"
            >
              {showStopSearch ? "정류소 검색 닫기" : "🚏 정류소 이름으로 도착 정보 검색"}
            </button>

            {/* 정류소 검색 패널 */}
            {showStopSearch && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">정류소 검색</h2>
                <StopSearchPanel onStopSelect={handleStopSelect} />
              </div>
            )}

            {/* 선택된 정류소 도착 정보 */}
            {selectedStopId && selectedStopName && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">🚏 {selectedStopName}</h2>
                  <button
                    onClick={() => {
                      setSelectedStopId(null);
                      setSelectedStopName(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100"
                  >
                    닫기
                  </button>
                </div>
                
                {arrivalLoading && (
                  <p className="text-center py-4 text-gray-500">도착 정보 로딩 중...</p>
                )}
                
                {arrivalError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
                    {arrivalError}
                  </div>
                )}
                
                <ArrivalPanel arrivals={arrivals} />
              </div>
            )}

            {/* 실시간 버스 위치 지도 */}
            {selectedRoute && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <BusMap
                  locations={busLocations}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
