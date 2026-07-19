"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { LocateFixed, MapPin, Loader2, X, RefreshCw, Navigation, Ban } from "lucide-react";
import ArrivalPanel from "@/components/bus/ArrivalPanel";
import ErrorAlert from "@/components/ui/ErrorAlert";
import GlassCard from "@/components/ui/GlassCard";
import { useBusArrivals } from "@/hooks/useBusArrivals";
import { nearbyStopIds } from "@/lib/stop-utils";

interface NearbyStop {
  stopId: string;
  stopName: string;
  arsno: string;
  gpsX: string;
  gpsY: string;
  dist: number;
}

interface SelectedStop {
  id: string;
  name: string;
  nearbyIds: string[];
}

type GeoStatus = "idle" | "locating" | "denied" | "unavailable" | "error";

function formatDist(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

export default function NearbyPanel() {
  const [stops, setStops] = useState<NearbyStop[]>([]);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedStop | null>(null);

  const { arrivals = [], arrivalLoading, arrivalError } = useBusArrivals(
    selected?.id ?? null,
    selected?.nearbyIds ?? []
  );

  const fetchStops = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bus/stops-nearby?lat=${lat}&lng=${lng}&limit=20`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.details || "주변 정류소 조회 실패");
      setStops(data.stops ?? []);
      if ((data.stops ?? []).length === 0) setError("주변 정류소를 찾지 못했습니다.");
    } catch (err: any) {
      setError("주변 정류소 조회 실패: " + err.message);
      setStops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const locate = useCallback(() => {
    setSelected(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus("idle");
        fetchStops(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setGeoStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [fetchStops]);

  // 첫 진입 시 자동으로 현재 위치 요청
  useEffect(() => {
    locate();
  }, [locate]);

  const handleSelect = (stop: NearbyStop) => {
    setSelected({
      id: stop.stopId,
      name: stop.stopName,
      nearbyIds: nearbyStopIds(stop, stops),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2563eb]/12 flex items-center justify-center">
            <LocateFixed className="w-4 h-4 text-[#2563eb]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">내 주변 정류소</h2>
            <p className="text-[11px] text-slate-500">
              {stops.length > 0 ? `가까운 순 ${stops.length}곳` : "현재 위치 기준"}
            </p>
          </div>
        </div>
        <button
          onClick={locate}
          disabled={geoStatus === "locating" || loading}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 transition-colors disabled:opacity-40"
          aria-label="현재 위치 다시 찾기"
        >
          <RefreshCw className={`w-4 h-4 ${geoStatus === "locating" || loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* 위치 확인 중 */}
      {(geoStatus === "locating" || (loading && stops.length === 0)) && (
        <div className="flex flex-col items-center gap-3 py-14 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
          <p className="text-sm">{geoStatus === "locating" ? "현재 위치 확인 중..." : "주변 정류소 불러오는 중..."}</p>
        </div>
      )}

      {/* 권한 거부 / 오류 / 미지원 */}
      {(geoStatus === "denied" || geoStatus === "unavailable" || geoStatus === "error") && (
        <GlassCard className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/12 flex items-center justify-center">
            <Ban className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {geoStatus === "denied"
                ? "위치 권한이 거부되었습니다"
                : geoStatus === "unavailable"
                ? "위치 기능을 사용할 수 없습니다"
                : "위치를 가져오지 못했습니다"}
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {geoStatus === "denied"
                ? "브라우저 주소창의 위치 아이콘에서 권한을 허용한 뒤 다시 시도하거나, 정류소 탭에서 이름으로 검색하세요."
                : "정류소 탭에서 이름으로 검색해 이용할 수 있습니다."}
            </p>
          </div>
          <button
            onClick={locate}
            className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            다시 시도
          </button>
        </GlassCard>
      )}

      {error && geoStatus === "idle" && <ErrorAlert message={error} />}

      {/* 주변 정류소 목록 */}
      {geoStatus === "idle" && stops.length > 0 && (
        <motion.div
          className="flex flex-col gap-2"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          {stops.map((stop) => {
            const active = selected?.id === stop.stopId;
            return (
              <motion.button
                key={stop.stopId}
                onClick={() => handleSelect(stop)}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
                }}
                whileTap={{ scale: 0.98 }}
                className={`glass-card text-left transition-all group ${
                  active
                    ? "border-[#2563eb]/50 bg-[#2563eb]/[0.06]"
                    : "hover:bg-white hover:shadow-[0_12px_36px_rgba(15,23,42,0.12)]"
                }`}
                aria-label={`${stop.stopName} 정류소 선택 (${formatDist(stop.dist)})`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{stop.stopName}</p>
                    {stop.arsno && stop.arsno !== "0" && (
                      <span className="text-[10px] text-slate-500 font-mono">정류장 번호 {stop.arsno}</span>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-xs font-bold text-[#2563eb] font-mono">
                    {formatDist(stop.dist)}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* 선택한 정류소 도착정보 */}
      {selected && (
        <div className="flex flex-col gap-3">
          <GlassCard className="flex items-center justify-between py-3" glowColor="green">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#00ff88]/15 flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-slate-900">{selected.name}</span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="p-1.5 rounded-lg hover:bg-slate-900/5 transition-colors text-slate-500 hover:text-slate-900"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </GlassCard>

          {arrivalLoading && arrivals.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#00ff88]/10 border border-emerald-500/20 text-sm text-emerald-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              도착 정보 불러오는 중...
            </div>
          )}
          {arrivalError && <ErrorAlert message={arrivalError} />}
          {!(arrivalLoading && arrivals.length === 0) && <ArrivalPanel arrivals={arrivals} />}
        </div>
      )}
    </div>
  );
}
