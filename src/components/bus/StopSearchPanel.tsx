"use client";

import { Search, MapPin, Loader2, ArrowRight, Star, X, Clock } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { nearbyStopIds } from "@/lib/stop-utils";
import { useStopHistory, type SavedStop } from "@/hooks/useStopHistory";

interface Stop {
  stopId: string;
  stopName: string;
  arsno: string;
  gpsX: string;
  gpsY: string;
}

interface StopSearchPanelProps {
  onStopSelect: (stopId: string, stopName: string, nearbyIds: string[]) => void;
}

/** 정류장 번호(ARS) 표시용 라벨 — 숫자만 있을 때만 노출 */
function stationLabel(stop: { arsno?: string }): string {
  if (stop.arsno && stop.arsno !== "0") return `정류장 번호 ${stop.arsno}`;
  return "";
}

/** 이름이 비어있거나 숫자만일 때 대비한 표시 이름 */
function displayName(stop: { stopName?: string; arsno?: string }): string {
  const name = (stop.stopName || "").trim();
  if (name && !/^\d+$/.test(name)) return name;
  // 이름이 없으면 최소한 정류장 번호라도 이름 자리에 표시
  return name || (stop.arsno ? `정류장 ${stop.arsno}` : "이름 미상 정류장");
}

/** 즐겨찾기/최근 검색 목록의 한 줄 (@types/react 미설치라 커스텀 컴포넌트엔 key를 못 넘김) */
function renderHistoryRow({
  stop,
  onSelect,
  onRemove,
  removeLabel,
}: {
  stop: SavedStop;
  onSelect: () => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  const name = displayName(stop);
  const label = stationLabel(stop);
  return (
    <div
      key={stop.stopId}
      className="flex items-center gap-1 rounded-xl hover:bg-slate-900/4 transition-colors"
    >
      <button
        onClick={onSelect}
        className="flex-1 min-w-0 flex items-center gap-2.5 px-2 py-2 text-left"
        aria-label={`${name} 정류소 조회`}
      >
        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span className="text-sm text-slate-800 truncate">{name}</span>
        {label && (
          <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{stop.arsno}</span>
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-slate-600 hover:bg-slate-900/6 active:bg-slate-900/10 transition-colors flex-shrink-0"
        aria-label={removeLabel}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function StopSearchPanel({ onStopSelect }: StopSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  // 정류소별 다음 정류소 이름 (방향 구분용)
  const [nextStops, setNextStops] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const searchTokenRef = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    recent,
    favorites,
    addRecent,
    removeRecent,
    clearRecent,
    toggleFavorite,
    removeFavorite,
    isFavorite,
  } = useStopHistory();

  const hasHistory = favorites.length > 0 || recent.length > 0;

  // 바깥 클릭 / Esc 로 목록 닫기
  useEffect(() => {
    if (!showHistory) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowHistory(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showHistory]);

  // 검색 결과 각 정류소의 다음 정류소 이름을 조회
  const loadNextStops = (found: Stop[], token: number) => {
    found.forEach(async (stop) => {
      try {
        const res = await fetch(
          `/api/bus/next-stop?stopId=${encodeURIComponent(stop.stopId)}&arsno=${encodeURIComponent(
            stop.arsno || ""
          )}`
        );
        const data = await res.json();
        // 최신 검색 결과에 대해서만 반영
        if (token === searchTokenRef.current && data?.nextStop) {
          setNextStops((prev) => ({ ...prev, [stop.stopId]: data.nextStop }));
        }
      } catch {
        /* 다음 정류소 조회 실패는 무시 */
      }
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const token = ++searchTokenRef.current;
    setShowHistory(false);
    setLoading(true);
    setError(null);
    setNextStops({});

    try {
      const response = await fetch(
        `/api/bus/stops?stopName=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || `API Error: ${response.status}`);
      }

      const found: Stop[] = data.stops || [];
      setStops(found);
      if (found.length === 0) {
        setError("검색 결과가 없습니다.");
      } else {
        loadNextStops(found, token);
      }
    } catch (err: any) {
      setError("검색 실패: " + err.message);
      setStops([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  /** 검색 결과에서 정류소 선택 — 최근 검색에 저장 후 조회 */
  const selectFromResults = (stop: Stop) => {
    const name = displayName(stop);
    const nearbyIds = nearbyStopIds(stop, stops);
    addRecent({ stopId: stop.stopId, stopName: name, arsno: stop.arsno || "", nearbyIds });
    setShowHistory(false);
    onStopSelect(stop.stopId, name, nearbyIds);
  };

  /** 즐겨찾기/최근 검색에서 정류소 선택 — 최근 검색 맨 앞으로 올린 뒤 조회 */
  const selectFromHistory = (stop: SavedStop) => {
    const name = displayName(stop);
    addRecent({
      stopId: stop.stopId,
      stopName: name,
      arsno: stop.arsno,
      nearbyIds: stop.nearbyIds,
    });
    setShowHistory(false);
    onStopSelect(stop.stopId, name, stop.nearbyIds);
  };

  return (
    <div ref={panelRef} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowHistory(true)}
            placeholder="정류소 이름 검색 (예: 부산역)"
            className="glass-input w-full pl-10 pr-4 py-3 text-sm"
            aria-label="정류소 이름 검색"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !searchQuery.trim()}
          className="btn-primary px-4 py-3 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span className="text-sm hidden sm:inline">{loading ? "검색중" : "검색"}</span>
        </button>
      </div>

      {showHistory && hasHistory && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-3 rounded-2xl border border-slate-900/8 bg-white/70 backdrop-blur-md p-2 max-h-72 overflow-y-auto"
        >
          {favorites.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] font-semibold text-slate-500 px-2 py-1 flex items-center gap-1.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                즐겨찾기
              </p>
              {favorites.map((stop) =>
                renderHistoryRow({
                  stop,
                  onSelect: () => selectFromHistory(stop),
                  onRemove: () => removeFavorite(stop.stopId),
                  removeLabel: `${displayName(stop)} 즐겨찾기 삭제`,
                })
              )}
            </div>
          )}

          {recent.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  최근 검색
                </p>
                <button
                  onClick={clearRecent}
                  className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                >
                  전체 삭제
                </button>
              </div>
              {recent.map((stop) =>
                renderHistoryRow({
                  stop,
                  onSelect: () => selectFromHistory(stop),
                  onRemove: () => removeRecent(stop.stopId),
                  removeLabel: `${displayName(stop)} 최근 검색에서 삭제`,
                })
              )}
            </div>
          )}
        </motion.div>
      )}

      {error && <ErrorAlert message={error} />}

      {stops.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500 px-1">{stops.length}개의 정류소</p>
          <motion.div
            className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {stops.map((stop) => {
              const name = displayName(stop);
              const label = stationLabel(stop);
              const nextStop = nextStops[stop.stopId];
              const starred = isFavorite(stop.stopId);
              return (
                <motion.div
                  key={stop.stopId}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="glass-card hover:bg-white hover:shadow-[0_12px_36px_rgba(15,23,42,0.12)] text-left transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectFromResults(stop)}
                      className="flex-1 min-w-0 flex items-center gap-3 text-left"
                      aria-label={`${name} 정류소 선택${nextStop ? `, 다음 ${nextStop} 방면` : ""}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                          {label && (
                            <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                              {label}
                            </span>
                          )}
                          {nextStop && (
                            <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 min-w-0">
                              <ArrowRight className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate">{nextStop} 방면</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        // 별표는 행 선택과 독립적으로 동작 — 정류소가 조회되지 않도록 전파 차단
                        e.stopPropagation();
                        toggleFavorite({
                          stopId: stop.stopId,
                          stopName: name,
                          arsno: stop.arsno || "",
                          nearbyIds: nearbyStopIds(stop, stops),
                        });
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      // -my-1.5: 터치 영역은 44px 유지하되 행 높이는 기존과 동일하게
                      className="w-11 h-11 -my-1.5 flex items-center justify-center rounded-xl hover:bg-slate-900/6 active:bg-slate-900/10 transition-colors flex-shrink-0"
                      aria-label={`${name} ${starred ? "즐겨찾기 해제" : "즐겨찾기 추가"}`}
                      aria-pressed={starred}
                    >
                      <Star
                        className={`w-4 h-4 transition-colors ${
                          starred ? "fill-amber-400 text-amber-400" : "text-slate-300"
                        }`}
                      />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {!loading && stops.length === 0 && !error && !(showHistory && hasHistory) && (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-600">
          <MapPin className="w-8 h-8" />
          <p className="text-sm">
            {hasHistory
              ? "검색창을 누르면 즐겨찾기와 최근 검색이 표시됩니다"
              : "정류소 이름을 입력하고 검색하세요"}
          </p>
        </div>
      )}
    </div>
  );
}
