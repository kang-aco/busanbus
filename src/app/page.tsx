"use client";

import { useState } from "react";
import {
  Bus,
  MapPin,
  Navigation,
  Loader2,
  RefreshCw,
  X,
  Star,
} from "lucide-react";
import BusSearchPanel from "@/components/bus/BusSearchPanel";
import RouteList from "@/components/bus/RouteList";
import RouteDetailPanel from "@/components/bus/RouteDetailPanel";
import ArrivalPanel from "@/components/bus/ArrivalPanel";
import BusMap from "@/components/bus/BusMap";
import StopSearchPanel from "@/components/bus/StopSearchPanel";
import DirectionsPanel from "@/components/directions/DirectionsPanel";
import GlassCard from "@/components/ui/GlassCard";
import { useBusSearch } from "@/hooks/useBusSearch";
import { useBusLocations } from "@/hooks/useBusLocations";
import { useBusArrivals } from "@/hooks/useBusArrivals";
import { useFavorites } from "@/hooks/useFavorites";
import type { BusRoute } from "@/lib/bus-api/types";

type Tab = "routes" | "stops" | "directions";

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: "routes", label: "노선", icon: <Bus className="w-5 h-5" /> },
  { id: "stops", label: "정류소", icon: <MapPin className="w-5 h-5" /> },
  { id: "directions", label: "길찾기", icon: <Navigation className="w-5 h-5" /> },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("routes");
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedStopName, setSelectedStopName] = useState<string | null>(null);

  const { routes = [], loading = false, error = null, searchBus } = useBusSearch();
  const {
    locations: busLocations = [],
    locationLoading,
    locationError,
    refreshLocations,
  } = useBusLocations(selectedRoute?.lineId || null);
  const { arrivals = [], arrivalLoading, arrivalError } = useBusArrivals(selectedStopId);
  const { favorites = [], toggleFavorite } = useFavorites();

  const isFavorite = (lineId: string) => favorites.includes(lineId);

  const handleSearch = (lineNo: string) => {
    if (searchBus) searchBus(lineNo);
    setSelectedRoute(null);
  };

  const handleRouteSelect = (route: BusRoute) => {
    setSelectedRoute(route);
  };

  const handleStopSelect = (stopId: string, stopName: string) => {
    setSelectedStopId(stopId);
    setSelectedStopName(stopName);
  };

  const clearStop = () => {
    setSelectedStopId(null);
    setSelectedStopName(null);
  };

  const clearRoute = () => {
    setSelectedRoute(null);
  };

  return (
    <div className="flex flex-col h-full bg-space-900 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-safe-top pt-4 pb-3 border-b border-white/8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0066ff] flex items-center justify-center neon-glow-blue">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">부산 버스 라이브</h1>
              <p className="text-[10px] text-slate-500 leading-tight">실시간 버스 정보</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#00ff88]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] pulse-dot" />
            <span>LIVE</span>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex-shrink-0 border-b border-white/8">
        <div className="flex max-w-2xl mx-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all relative ${
                activeTab === tab.id
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">{tab.label}</span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066ff] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 pb-6">

          {/* ===== ROUTES TAB ===== */}
          {activeTab === "routes" && (
            <div className="flex flex-col gap-4">
              <GlassCard>
                <BusSearchPanel
                  onSearch={handleSearch}
                  onRouteSelect={handleRouteSelect}
                  routes={routes}
                  loading={loading}
                  error={error}
                />
              </GlassCard>

              {/* Route list */}
              {routes.length > 0 && !selectedRoute && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-500 px-1">
                    {routes.length}개의 노선을 찾았습니다
                  </p>
                  <RouteList
                    routes={routes}
                    selectedRouteId={selectedRoute?.lineId ?? null}
                    onSelect={handleRouteSelect}
                    isFavorite={isFavorite}
                    onToggleFavorite={(route) => toggleFavorite(route.lineId)}
                  />
                </div>
              )}

              {/* Selected route details */}
              {selectedRoute && (
                <div className="flex flex-col gap-3">
                  {/* Selected route header */}
                  <GlassCard className="flex items-center justify-between py-3" glowColor="blue">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0066ff]/20 flex items-center justify-center">
                        <Bus className="w-3.5 h-3.5 text-[#4d94ff]" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white">
                          {(selectedRoute.lineNo || selectedRoute.lineId).split(":").pop()}번
                        </span>
                        {isFavorite(selectedRoute.lineId) && (
                          <Star className="inline ml-1.5 w-3 h-3 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFavorite(selectedRoute.lineId)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label={isFavorite(selectedRoute.lineId) ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isFavorite(selectedRoute.lineId)
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-500"
                          }`}
                        />
                      </button>
                      {refreshLocations && (
                        <button
                          onClick={refreshLocations}
                          disabled={locationLoading}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                          aria-label="위치 새로고침"
                        >
                          <RefreshCw className={`w-4 h-4 ${locationLoading ? "animate-spin" : ""}`} />
                        </button>
                      )}
                      <button
                        onClick={clearRoute}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                        aria-label="닫기"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </GlassCard>

                  {/* Location loading/error */}
                  {locationLoading && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#0066ff]/10 border border-[#0066ff]/20 text-sm text-[#4d94ff]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      버스 위치 정보를 불러오는 중...
                    </div>
                  )}

                  {locationError && (
                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-sm text-red-400">{locationError}</p>
                    </div>
                  )}

                  {/* Route details */}
                  <GlassCard>
                    <RouteDetailPanel route={selectedRoute} locations={busLocations} />
                  </GlassCard>

                  {/* Map */}
                  <BusMap locations={busLocations} />
                </div>
              )}

              {/* Favorites section (when no search yet) */}
              {routes.length === 0 && !loading && favorites.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-500 px-1 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    즐겨찾기
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {favorites.map((lineId) => (
                      <button
                        key={lineId}
                        onClick={() => handleSearch(lineId.split(":").pop() || lineId)}
                        className="px-3 py-1.5 text-xs rounded-xl border border-amber-400/20 bg-amber-400/8 text-amber-300 hover:bg-amber-400/15 transition-all"
                      >
                        {lineId.split(":").pop()}번
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {routes.length === 0 && !loading && !error && favorites.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-slate-600">
                  <Bus className="w-12 h-12" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-500">버스 번호를 검색하세요</p>
                    <p className="text-xs text-slate-600 mt-1">예: 179, 1003, 63</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== STOPS TAB ===== */}
          {activeTab === "stops" && (
            <div className="flex flex-col gap-4">
              <GlassCard>
                <StopSearchPanel onStopSelect={handleStopSelect} />
              </GlassCard>

              {/* Selected stop arrivals */}
              {selectedStopId && selectedStopName && (
                <div className="flex flex-col gap-3">
                  <GlassCard className="flex items-center justify-between py-3" glowColor="green">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#00ff88]/15 flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5 text-[#00ff88]" />
                      </div>
                      <span className="text-sm font-semibold text-white">{selectedStopName}</span>
                    </div>
                    <button
                      onClick={clearStop}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                      aria-label="닫기"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </GlassCard>

                  {arrivalLoading && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 text-sm text-[#00ff88]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      도착 정보 불러오는 중...
                    </div>
                  )}

                  {arrivalError && (
                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-sm text-red-400">{arrivalError}</p>
                    </div>
                  )}

                  {!arrivalLoading && (
                    <ArrivalPanel arrivals={arrivals} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== DIRECTIONS TAB ===== */}
          {activeTab === "directions" && (
            <DirectionsPanel />
          )}
        </div>
      </main>
    </div>
  );
}
