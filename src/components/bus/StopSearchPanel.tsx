"use client";

import { Search, MapPin, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { motion } from "motion/react";
import ErrorAlert from "@/components/ui/ErrorAlert";

interface Stop {
  stopId: string;
  stopName: string;
  arsno: string;
  gpsX: string;
  gpsY: string;
}

interface StopSearchPanelProps {
  onStopSelect: (stopId: string, stopName: string) => void;
}

export default function StopSearchPanel({ onStopSelect }: StopSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/bus/stops?stopName=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || `API Error: ${response.status}`);
      }

      setStops(data.stops || []);
      if (!data.stops || data.stops.length === 0) {
        setError("검색 결과가 없습니다.");
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
            {stops.map((stop) => (
              <motion.button
                key={stop.stopId}
                onClick={() => onStopSelect(stop.stopId, stop.stopName)}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="glass-card hover:bg-white/8 hover:border-white/20 text-left transition-colors group"
                aria-label={`${stop.stopName} 정류소 선택`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00ff88]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#00ff88]/20 transition-colors">
                    <MapPin className="w-4 h-4 text-[#00ff88]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{stop.stopName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {stop.arsno && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0066ff]/15 text-[#4d94ff] border border-[#0066ff]/20">
                          ARS {stop.arsno}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-600 font-mono">
                        #{stop.stopId}
                      </span>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[#00ff88]/10 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MapPin className="w-3 h-3 text-[#00ff88]" />
                  </div>
                </div>
              </motion.button>
            ))}
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
