"use client";

import { useState } from "react";
import BusSearchPanel from "@/components/bus/BusSearchPanel";
import RouteList from "@/components/bus/RouteList";
import RouteDetailPanel from "@/components/bus/RouteDetailPanel";
import ArrivalPanel from "@/components/bus/ArrivalPanel";
import BusMap from "@/components/bus/BusMap";
import StopSearchPanel from "@/components/bus/StopSearchPanel";
import { useBusSearch } from "@/hooks/useBusSearch";
import { useBusLocations } from "@/hooks/useBusLocations";
import { useFavorites } from "@/hooks/useFavorites";

interface Route {
  lineId: string;
  lineNo: string;
  busType: string;
  companyId: string;
}

export default function Home() {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedStopName, setSelectedStopName] = useState<string | null>(null);
  const [showStopSearch, setShowStopSearch] = useState(false);

  const { routes = [], loading = false, error = null, searchBus } = useBusSearch() || {};
  const { locations: busLocations = [] } = useBusLocations(selectedRoute?.lineId || null) || {};
  const { favorites = [], toggleFavorite } = useFavorites() || {};

  const handleSearch = (lineNo: string) => {
    if (searchBus) {
      searchBus(lineNo);
    }
    setSelectedRoute(null);
  };

  const handleRouteSelect = (route: Route) => {
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
                  onRouteSelect={handleRouteSelect}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            )}

            {selectedRoute && (
              <RouteDetailPanel
                route={selectedRoute}
                onBack={() => setSelectedRoute(null)}
              />
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
                <ArrivalPanel stopId={selectedStopId} />
              </div>
            )}

            {/* 실시간 버스 위치 지도 */}
            {selectedRoute && busLocations.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">
                  🚌 {selectedRoute.lineNo}번 실시간 위치
                </h2>
                <BusMap
                  locations={busLocations}
                  lineNo={selectedRoute.lineNo}
                />
              </div>
            )}

            {/* 버스 위치 없음 안내 */}
            {selectedRoute && busLocations.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">
                  🚌 {selectedRoute.lineNo}번 실시간 위치
                </h2>
                <div className="text-center py-8 text-gray-500">
                  <p>현재 운행 중인 버스가 없습니다.</p>
                  <p className="text-sm mt-2">운행 시간을 확인해주세요.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}