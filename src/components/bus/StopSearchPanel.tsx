"use client";

import { Search, MapPin, Loader2, ArrowRight } from "lucide-react";
import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { nearbyStopIds } from "@/lib/stop-utils";

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
function stationLabel(stop: Stop): string {
  if (stop.arsno && stop.arsno !== "0") return `정류장 번호 ${stop.arsno}`;
  return "";
}

/** 이름이 비어있거나 숫자만일 때 대비한 표시 이름 */
function displayName(stop: Stop): string {
  const name = (stop.stopName || "").trim();
  if (name && !/^\d+$/.test(name)) return name;
  // 이름이 없으면 최소한 정류장 번호라도 이름 자리에 표시
  return name || (stop.arsno ? `정류장 ${stop.arsno}` : "이름 미상 정류장");
}

export default function StopSearchPanel({ onStopSelect }: StopSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  // 정류소별 다음 정류소 이름 (방향 구분용)
  const [nextStops, setNextStops] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTokenRef = useRef(0);

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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
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
              return (
                <motion.button
                  key={stop.stopId}
                  onClick={() => onStopSelect(stop.stopId, name, nearbyStopIds(stop, stops))}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="glass-card hover:bg-white hover:shadow-[0_12px_36px_rgba(15,23,42,0.12)] text-left transition-all group"
                  aria-label={`${name} 정류소 선택${nextStop ? `, 다음 ${nextStop} 방면` : ""}`}
                >
                  <div className="flex items-center gap-3">
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
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      )}

      {!loading && stops.length === 0 && !error && (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-600">
          <MapPin className="w-8 h-8" />
          <p className="text-sm">정류소 이름을 입력하고 검색하세요</p>
        </div>
      )}
    </div>
  );
}
