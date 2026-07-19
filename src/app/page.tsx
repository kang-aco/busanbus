"use client";

import type { JSX } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bus, MapPin, Navigation, Loader2, RefreshCw, X, Star } from "lucide-react";
import BusSearchPanel from "@/components/bus/BusSearchPanel";
import RouteList from "@/components/bus/RouteList";
import RouteDetailPanel from "@/components/bus/RouteDetailPanel";
import ArrivalPanel from "@/components/bus/ArrivalPanel";
import BusMap from "@/components/bus/BusMap";
import StopSearchPanel from "@/components/bus/StopSearchPanel";
import DirectionsPanel from "@/components/directions/DirectionsPanel";
import ErrorAlert from "@/components/ui/ErrorAlert";
import GlassCard from "@/components/ui/GlassCard";
import { useBusSearch } from "@/hooks/useBusSearch";
import { useBusLocations } from "@/hooks/useBusLocations";
import { useBusArrivals } from "@/hooks/useBusArrivals";
import { useBusRouteStops } from "@/hooks/useBusRouteStops";
import { useFavorites } from "@/hooks/useFavorites";
import { routeDisplayNumber } from "@/lib/utils";
import type { BusRoute } from "@/lib/bus-api/types";

type Tab = "routes" | "stops" | "directions";

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: "routes", label: "노선", icon: <Bus className="w-5 h-5" /> },
  { id: "stops", label: "정류소", icon: <MapPin className="w-5 h-5" /> },
  { id: "directions", label: "길찾기", icon: <Navigation className="w-5 h-5" /> },
];

interface SelectedStop {
  id: string;
  name: string;
  nearbyIds?: string[];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const tabVariants = {
  enter: { opacity: 0, y: 10 },
  center: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("routes");
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [selectedStop, setSelectedStop] = useState<SelectedStop | null>(null);

  const { routes = [], loading = false, error = null, searchBus } = useBusSearch();
  const {
    locations: busLocations = [],
    locationLoading,
    locationError,
    lastUpdated,
    refreshLocations,
  } = useBusLocations(selectedRoute?.lineId || null);
  const { arrivals = [], arrivalLoading, arrivalError } = useBusArrivals(
    selectedStop?.id ?? null,
    selectedStop?.nearbyIds ?? []
  );
  const { stops: routeStops } = useBusRouteStops(selectedRoute?.lineId ?? null);
  const { favorites = [], toggleFavorite } = useFavorites();

  const isFavorite = (lineId: string) => favorites.includes(lineId);

  const handleSearch = (lineNo: string) => {
    if (searchBus) searchBus(lineNo);
    setSelectedRoute(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex-shrink-0 px-4 pt-safe-top pt-4 pb-3 border-b border-slate-900/8 bg-white/60 backdrop-blur-md">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2563eb] flex items-center justify-center neon-glow-blue">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">부산 버스 라이브</h1>
              <p className="text-[10px] text-slate-500 leading-tight">실시간 버스 정보</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
            <span>LIVE</span>
          </div>
        </div>
      </header>

      <div className="flex-shrink-0 border-b border-slate-900/8 bg-white/40 backdrop-blur-md">
        <div className="flex max-w-2xl mx-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all relative ${
                activeTab === tab.id ? "text-[#2563eb]" : "text-slate-500 hover:text-slate-700"
              }`}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.icon}
              <span className="text-xs sm:text-sm">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.span
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563eb] rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={tabVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >

              {activeTab === "routes" && (
                <div className="flex flex-col gap-4">
                  <GlassCard>
                    <BusSearchPanel onSearch={handleSearch} loading={loading} error={error} />
                  </GlassCard>

                  {routes.length > 0 && !selectedRoute && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-slate-500 px-1">{routes.length}개의 노선을 찾았습니다</p>
                      <RouteList
                        routes={routes}
                        selectedRouteId={selectedRoute}
                        onSelect={setSelectedRoute}
                        isFavorite={isFavorite}
                        onToggleFavorite={(route) => toggleFavorite(route.lineId)}
                      />
                    </div>
                  )}

                  {selectedRoute && (
                    <div className="flex flex-col gap-3">
                      <GlassCard className="flex items-center justify-between py-3" glowColor="blue">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#2563eb]/12 flex items-center justify-center">
                            <Bus className="w-3.5 h-3.5 text-[#2563eb]" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-900">
                              {routeDisplayNumber(selectedRoute.lineNo, selectedRoute.lineId)}번
                            </span>
                            {isFavorite(selectedRoute.lineId) && (
                              <Star className="inline ml-1.5 w-3 h-3 fill-amber-400 text-amber-400" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {lastUpdated && !locationLoading && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatTime(lastUpdated)}
                            </span>
                          )}
                          <button
                            onClick={() => toggleFavorite(selectedRoute.lineId)}
                            className="p-1.5 rounded-lg hover:bg-slate-900/5 transition-colors"
                            aria-label={isFavorite(selectedRoute.lineId) ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                isFavorite(selectedRoute.lineId)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-400"
                              }`}
                            />
                          </button>
                          {refreshLocations && (
                            <button
                              onClick={refreshLocations}
                              disabled={locationLoading}
                              className="p-1.5 rounded-lg hover:bg-slate-900/5 transition-colors text-slate-500 hover:text-slate-800"
                              aria-label="위치 새로고침"
                            >
                              <RefreshCw className={`w-4 h-4 ${locationLoading ? "animate-spin" : ""}`} />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedRoute(null)}
                            className="p-1.5 rounded-lg hover:bg-slate-900/5 transition-colors text-slate-500 hover:text-slate-800"
                            aria-label="닫기"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </GlassCard>

                      {locationLoading && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#2563eb]/8 border border-[#2563eb]/15 text-sm text-[#2563eb]">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          버스 위치 정보를 불러오는 중...
                        </div>
                      )}
                      {locationError && <ErrorAlert message={locationError} />}

                      <GlassCard>
                        <RouteDetailPanel route={selectedRoute} locations={busLocations} stops={routeStops} />
                      </GlassCard>

                      <BusMap
                        locations={busLocations}
                        routeStops={routeStops}
                        lineId={selectedRoute?.lineId ?? null}
                      />
                    </div>
                  )}

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
                            onClick={() => handleSearch(routeDisplayNumber(undefined, lineId))}
                            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-amber-300/50 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
                          >
                            {routeDisplayNumber(undefined, lineId)}번
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {routes.length === 0 && !loading && !error && favorites.length === 0 && (
                    <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                      <Bus className="w-12 h-12" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-600">버스 번호를 검색하세요</p>
                        <p className="text-xs text-slate-400 mt-1">예: 179, 1003, 63</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "stops" && (
                <div className="flex flex-col gap-4">
                  <GlassCard>
                    <StopSearchPanel
                      onStopSelect={(id, name, nearbyIds) => setSelectedStop({ id, name, nearbyIds })}
                    />
                  </GlassCard>

                  {selectedStop && (
                    <div className="flex flex-col gap-3">
                      <GlassCard className="flex items-center justify-between py-3" glowColor="green">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/12 flex items-center justify-center">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{selectedStop.name}</span>
                        </div>
                        <button
                          onClick={() => setSelectedStop(null)}
                          className="p-1.5 rounded-lg hover:bg-slate-900/5 transition-colors text-slate-500 hover:text-slate-800"
                          aria-label="닫기"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </GlassCard>

                      {arrivalLoading && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-sm text-emerald-700">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          도착 정보 불러오는 중...
                        </div>
                      )}
                      {arrivalError && <ErrorAlert message={arrivalError} />}

                      {!arrivalLoading && <ArrivalPanel arrivals={arrivals} />}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "directions" && <DirectionsPanel />}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
