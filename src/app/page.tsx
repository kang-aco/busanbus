"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BusSearchPanel } from "@/components/bus/BusSearchPanel";
import { RouteList } from "@/components/bus/RouteList";
import { RouteDetailPanel } from "@/components/bus/RouteDetailPanel";
import { ArrivalPanel } from "@/components/bus/ArrivalPanel";
import { BusMap } from "@/components/bus/BusMap";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { useBusSearch } from "@/hooks/useBusSearch";
import { useBusLocations } from "@/hooks/useBusLocations";
import { useBusArrivals } from "@/hooks/useBusArrivals";
import { useFavorites } from "@/hooks/useFavorites";
import { useDebounce } from "@/hooks/useDebounce";
import type { BusRoute } from "@/lib/bus-api/types";

export default function Page() {
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string>("");

  const { searchQuery, setSearchQuery, routes, searchLoading, searchError, searchBus } =
    useBusSearch();
  const { locations, locationLoading, locationError } = useBusLocations(
    selectedRoute?.lineId ?? null
  );

  // Debounce로 타이핑 완료 후 API 호출
  const debouncedStopId = useDebounce(selectedStopId.trim(), 800);
  const { arrivals, arrivalLoading, arrivalError } = useBusArrivals(
    debouncedStopId || null
  );

  const {
    favorites,
    loading: favoritesLoading,
    isFavorite,
    addFavorite,
    removeFavorite,
  } = useFavorites();

  const handleToggleFavorite = async (route: BusRoute, currentlyFavorite: boolean) => {
    try {
      if (currentlyFavorite) {
        await removeFavorite(route.lineId);
        toast.success(`${route.lineNo}번 즐겨찾기에서 제거되었습니다.`);
      } else {
        await addFavorite(route);
        toast.success(`${route.lineNo}번이 즐겨찾기에 추가되었습니다.`);
      }
    } catch (error: any) {
      toast.error(error?.message || "즐겨찾기 처리 중 오류가 발생했습니다.");
    }
  };

  const handleStopIdChange = (value: string) => {
    // 숫자만 허용
    if (value && !/^\d*$/.test(value)) {
      toast.error("정류소 ID는 숫자만 입력 가능합니다.");
      return;
    }
    setSelectedStopId(value);
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-4 bg-gray-50 p-4">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">부산 버스 라이브</h1>
        <p className="mt-1 text-sm text-gray-600">
          실시간 버스 위치 및 도착 정보를 확인하세요
        </p>
      </header>

      <BusSearchPanel
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={searchBus}
        loading={searchLoading}
      />

      {/* 즐겨찾기 섹션 */}
      {!favoritesLoading && favorites.length > 0 && (
        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">⭐ 즐겨찾기</h2>
          <div className="flex flex-wrap gap-2">
            {favorites.map((fav) => (
              <button
                key={fav.lineId}
                onClick={() => {
                  setSearchQuery(fav.lineNo);
                  searchBus(fav.lineNo);
                }}
                className="rounded-full bg-yellow-50 border border-yellow-200 px-3 py-1 text-sm text-yellow-700 hover:bg-yellow-100 transition"
              >
                {fav.lineNo}번
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 에러 메시지 - 개별 표시 */}
      {searchError && <ErrorBanner message={`검색 실패: ${searchError}`} />}
      {locationError && <ErrorBanner message={`위치 조회 실패: ${locationError}`} />}
      {arrivalError && <ErrorBanner message={`도착 정보 실패: ${arrivalError}`} />}

      {/* 검색 결과 */}
      {searchLoading ? (
        <div
          className="rounded-3xl border bg-white p-10 text-center shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">노선 검색 중...</p>
        </div>
      ) : (
        routes.length > 0 && (
          <RouteList
            routes={routes}
            selectedRouteId={selectedRoute?.lineId ?? null}
            onSelect={(route) => {
              setSelectedRoute(route);
              setSelectedStopId("");
            }}
            isFavorite={isFavorite}
            onToggleFavorite={handleToggleFavorite}
          />
        )
      )}

      {/* 선택된 노선의 실시간 정보 */}
      {selectedRoute && (
        <>
          {locationLoading && (
            <div className="rounded-3xl border bg-white p-4 text-center shadow-sm">
              <p className="text-sm text-gray-500">버스 위치 불러오는 중...</p>
            </div>
          )}

          <RouteDetailPanel route={selectedRoute} locations={locations} />

          {/* Google Maps */}
          {locations.length > 0 && <BusMap locations={locations} />}

          {/* 도착 정보 조회 */}
          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">🚏 정류소 도착 정보</h2>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={selectedStopId}
                onChange={(e) => handleStopIdChange(e.target.value)}
                placeholder="정류소 ID 입력 (예: 123456)"
                className="flex-1 rounded-2xl border px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                aria-label="정류소 ID 입력"
              />
            </div>
            {debouncedStopId && debouncedStopId !== selectedStopId && (
              <p className="mt-2 text-xs text-gray-400">입력 대기 중...</p>
            )}
          </div>

          {arrivalLoading && (
            <div className="rounded-3xl border bg-white p-4 text-center shadow-sm">
              <p className="text-sm text-gray-500">도착 정보 불러오는 중...</p>
            </div>
          )}

          {debouncedStopId && <ArrivalPanel arrivals={arrivals} />}
        </>
      )}
    </main>
  );
}