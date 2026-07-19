"use client";

import type { ReactNode, FormEvent } from "react";
import { useState, useEffect, useCallback } from "react";
import { GoogleMap, DirectionsRenderer, useLoadScript } from "@react-google-maps/api";
import { motion, AnimatePresence } from "motion/react";
import ErrorAlert from "@/components/ui/ErrorAlert";
import {
  ArrowRight,
  Bus,
  Car,
  Bike,
  Footprints,
  Search,
  MapPin,
  Flag,
  Clock,
  Navigation,
  Loader2,
  ArrowLeftRight,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { stripHtml } from "@/lib/utils";
import GlassCard from "@/components/ui/GlassCard";

export type TransportMode = "transit" | "driving" | "bicycling" | "walking";

const MODES: { id: TransportMode; label: string; icon: ReactNode }[] = [
  { id: "transit", label: "대중교통", icon: <Bus className="w-4 h-4" /> },
  { id: "driving", label: "승용차", icon: <Car className="w-4 h-4" /> },
  { id: "bicycling", label: "자전거", icon: <Bike className="w-4 h-4" /> },
  { id: "walking", label: "도보", icon: <Footprints className="w-4 h-4" /> },
];

// 구글 지도는 한국 내 규제로 대중교통 외 경로 미지원
const GOOGLE_UNSUPPORTED_MODES: TransportMode[] = ["driving", "bicycling", "walking"];

const KAKAO_MODE: Record<TransportMode, string> = {
  transit: "transit",
  driving: "car",
  bicycling: "bicycle",
  walking: "foot",
};

const NAVER_MODE: Record<TransportMode, string> = {
  transit: "bus",
  driving: "car",
  bicycling: "bicycle",
  walking: "walk",
};

const STEP_MODE_COLORS: Record<string, string> = {
  TRANSIT: "text-[#2563eb]",
  WALKING: "text-slate-500",
  DRIVING: "text-amber-600",
  BICYCLING: "text-emerald-600",
};

const STEP_MODE_ICONS: Record<string, ReactNode> = {
  TRANSIT: <Bus className="w-3.5 h-3.5" />,
  WALKING: <Footprints className="w-3.5 h-3.5" />,
  DRIVING: <Car className="w-3.5 h-3.5" />,
  BICYCLING: <Bike className="w-3.5 h-3.5" />,
};

const mapContainerStyle = { width: "100%", height: "260px", borderRadius: "0.75rem" };

const lightMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f7fb" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dcfce7" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e5e9f0" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fef3c7" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#2563eb" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c7ddf5" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#2563eb" }] },
];

const BUSAN_CENTER = { lat: 35.1796, lng: 129.0756 };

interface ParsedStep {
  instruction: string;
  duration: string;
  distance: string;
  mode: string;
  transitLine?: string;
  numStops?: number;
  departureStop?: string;
  arrivalStop?: string;
  departureTime?: string;
}

interface ParsedRoute {
  duration: string;
  distance: string;
  departureTime?: string;
  arrivalTime?: string;
  transitLines: string[];
  numTransfers: number;
  steps: ParsedStep[];
}

/** DirectionsRoute → 요약/상세가 담긴 ParsedRoute 로 변환 */
function parseRoute(route: google.maps.DirectionsRoute): ParsedRoute {
  const leg = route.legs[0];
  const steps: ParsedStep[] = (leg?.steps ?? []).map((step) => ({
    instruction: stripHtml(step.instructions),
    duration: step.duration?.text ?? "",
    distance: step.distance?.text ?? "",
    mode: step.travel_mode,
    transitLine: step.transit?.line?.short_name || step.transit?.line?.name,
    numStops: step.transit?.num_stops,
    departureStop: step.transit?.departure_stop?.name,
    arrivalStop: step.transit?.arrival_stop?.name,
    departureTime: step.transit?.departure_time?.text,
  }));

  const transitSteps = (leg?.steps ?? []).filter((s) => s.travel_mode === "TRANSIT");
  const transitLines = transitSteps
    .map((s) => s.transit?.line?.short_name || s.transit?.line?.name || "")
    .filter(Boolean);

  return {
    duration: leg?.duration?.text ?? "",
    distance: leg?.distance?.text ?? "",
    departureTime: transitSteps[0]?.transit?.departure_time?.text,
    arrivalTime: transitSteps[transitSteps.length - 1]?.transit?.arrival_time?.text,
    transitLines,
    numTransfers: Math.max(0, transitLines.length - 1),
    steps,
  };
}

function ExternalMapLinks({
  origin,
  destination,
  mode,
}: {
  origin: string;
  destination: string;
  mode: TransportMode;
}) {
  const enc = encodeURIComponent;
  const kakaoUrl = `https://map.kakao.com/link/from/${enc(origin)}/to/${enc(destination)}`;
  const naverUrl = `https://map.naver.com/v5/directions/-/-/-/${NAVER_MODE[mode]}?c=14133310.0000000,4291799.0000000,13,0,0,0,dh&o=${enc(origin)}&d=${enc(destination)}`;

  return (
    <GlassCard className="gap-3">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-700">구글 지도 한국 경로 미지원</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            구글 지도 API는 한국 내 자동차·자전거·도보 경로를 지원하지 않습니다.
            카카오맵 또는 네이버 지도에서 확인해 주세요.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <a
          href={kakaoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#FEE500] text-[#3A1D1D] hover:bg-[#FFD700] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          카카오맵
        </a>
        <a
          href={naverUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#03C75A] text-white hover:bg-[#02B350] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          네이버 지도
        </a>
      </div>
    </GlassCard>
  );
}

// Inner component: only mounted when apiKey is ready
function DirectionsPanelInner({ apiKey }: { apiKey: string }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState<TransportMode>("transit");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [parsedRoutes, setParsedRoutes] = useState<ParsedRoute[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const { isLoaded } = useLoadScript({ googleMapsApiKey: apiKey });

  const isUnsupported = GOOGLE_UNSUPPORTED_MODES.includes(mode);

  const reset = useCallback(() => {
    setDirections(null);
    setParsedRoutes([]);
    setSelectedRouteIndex(0);
    setError(null);
  }, []);

  // 모드 변경 시 결과 초기화
  useEffect(() => { reset(); }, [mode, reset]);

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    reset();
  };

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!isLoaded || !origin.trim() || !destination.trim() || isUnsupported) return;

      setLoading(true);
      setError(null);
      setDirections(null);
      setParsedRoutes([]);
      setSelectedRouteIndex(0);

      let from = origin.trim();
      let to = destination.trim();
      if (!from.includes("부산")) from = `부산 ${from}`;
      if (!to.includes("부산")) to = `부산 ${to}`;

      const request: google.maps.DirectionsRequest = {
        origin: from,
        destination: to,
        travelMode: google.maps.TravelMode.TRANSIT,
        region: "kr",
        provideRouteAlternatives: true,
        transitOptions: {
          modes: [google.maps.TransitMode.BUS, google.maps.TransitMode.SUBWAY],
        },
      };

      new google.maps.DirectionsService().route(request, (result, status) => {
        setLoading(false);
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          setSelectedRouteIndex(0);
          setParsedRoutes(result.routes.map(parseRoute));
        } else {
          const messages: Partial<Record<google.maps.DirectionsStatus, string>> = {
            [google.maps.DirectionsStatus.NOT_FOUND]: "출발지 또는 도착지를 찾을 수 없습니다.",
            [google.maps.DirectionsStatus.ZERO_RESULTS]: "해당 경로를 찾을 수 없습니다. 출발지와 도착지를 확인해 주세요.",
            [google.maps.DirectionsStatus.REQUEST_DENIED]: "Directions API 사용 권한이 없습니다. API 키를 확인해 주세요.",
          };
          setError(messages[status] ?? `경로 검색 실패 (${status})`);
        }
      });
    },
    [isLoaded, origin, destination, isUnsupported]
  );

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="gap-3 flex flex-col">
        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
            <input
              type="text"
              value={origin}
              onChange={(e) => { setOrigin(e.target.value); reset(); }}
              placeholder="출발지 입력 (예: 서면역)"
              className="glass-input w-full pl-10 pr-4 py-3 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-200" />
            <button
              type="button"
              onClick={handleSwap}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 transition-colors"
              aria-label="출발지와 도착지 바꾸기"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="relative">
            <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2563eb]" />
            <input
              type="text"
              value={destination}
              onChange={(e) => { setDestination(e.target.value); reset(); }}
              placeholder="도착지 입력 (예: 해운대역)"
              className="glass-input w-full pl-10 pr-4 py-3 text-sm"
            />
          </div>

          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                  mode === m.id
                    ? "bg-[#2563eb] text-white shadow-md"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white"
                }`}
              >
                {m.icon}
                <span className="text-[10px] leading-tight">{m.label}</span>
              </button>
            ))}
          </div>

          {/* 대중교통만 검색 버튼 표시 */}
          {!isUnsupported && (
            <motion.button
              type="submit"
              disabled={!origin.trim() || !destination.trim() || loading || !isLoaded}
              className="btn-primary flex items-center justify-center gap-2 py-3 px-6 disabled:opacity-40 disabled:cursor-not-allowed w-full"
              whileTap={{ scale: 0.97 }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="text-sm font-semibold">{loading ? "검색 중..." : "경로 검색"}</span>
            </motion.button>
          )}
        </form>
      </GlassCard>

      {/* 비대중교통: 외부 앱 링크 */}
      <AnimatePresence>
        {isUnsupported && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <ExternalMapLinks
              origin={origin || "출발지"}
              destination={destination || "도착지"}
              mode={mode}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {error && <ErrorAlert message={error} />}

      <AnimatePresence>
        {parsedRoutes.length > 0 && directions && (
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          >
            {/* 경로 옵션 목록 — 클릭하여 선택 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-slate-500">{parsedRoutes.length}개의 경로</p>
                <div className="flex items-center gap-1 text-slate-500 text-xs">
                  <Bus className="w-3.5 h-3.5" />
                  <span>대중교통</span>
                </div>
              </div>
              {parsedRoutes.map((r, i) => {
                const active = i === selectedRouteIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedRouteIndex(i)}
                    aria-pressed={active}
                    className={`text-left rounded-2xl px-4 py-3 border transition-all ${
                      active
                        ? "border-[#2563eb]/50 bg-[#2563eb]/[0.06] shadow-[0_8px_24px_rgba(37,99,235,0.14)]"
                        : "border-slate-200 bg-white/60 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-2 min-w-0">
                        {i === 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#2563eb]/12 text-[#2563eb] flex-shrink-0">
                            추천
                          </span>
                        )}
                        <span className="text-xl font-bold text-slate-900 font-mono">{r.duration}</span>
                        <span className="text-xs text-slate-500 truncate">{r.distance}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 flex-shrink-0">
                        {r.numTransfers === 0 ? "환승 없음" : `환승 ${r.numTransfers}회`}
                      </span>
                    </div>

                    {r.transitLines.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        {r.transitLines.map((ln, li) => (
                          <span key={li} className="inline-flex items-center gap-1">
                            {li > 0 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#2563eb]/12 text-[#2563eb]">
                              <Bus className="w-3 h-3" />
                              {ln}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}

                    {(r.departureTime || r.arrivalTime) && (
                      <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {r.departureTime && <span>{r.departureTime} 출발</span>}
                        {r.departureTime && r.arrivalTime && <ArrowRight className="w-2.5 h-2.5" />}
                        {r.arrivalTime && <span>{r.arrivalTime} 도착</span>}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            <GlassCard className="p-2">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={BUSAN_CENTER}
                zoom={12}
                options={{ styles: lightMapStyles, disableDefaultUI: true, zoomControl: true }}
              >
                <DirectionsRenderer
                  key={selectedRouteIndex}
                  directions={directions}
                  options={{
                    routeIndex: selectedRouteIndex,
                    polylineOptions: { strokeColor: "#2563eb", strokeWeight: 5, strokeOpacity: 0.9 },
                    suppressMarkers: false,
                  }}
                />
              </GoogleMap>
            </GlassCard>

            <GlassCard className="gap-0 p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#2563eb]" />
                  상세 경로
                </h3>
              </div>
              <motion.div
                key={selectedRouteIndex}
                className="flex flex-col divide-y divide-slate-100"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              >
                {(parsedRoutes[selectedRouteIndex] ?? parsedRoutes[0]).steps.map((step, idx) => (
                  <motion.div
                    key={idx}
                    className="flex gap-3 px-4 py-3"
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 280, damping: 24 } },
                    }}
                  >
                    <div className={`mt-0.5 flex-shrink-0 ${STEP_MODE_COLORS[step.mode] || "text-slate-400"}`}>
                      {STEP_MODE_ICONS[step.mode] || <ArrowRight className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {step.transitLine && (
                        <div className="mb-1">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-[#2563eb]/12 text-[#2563eb]">
                            <Bus className="w-3 h-3" />
                            {step.transitLine}
                            {step.numStops ? ` (${step.numStops}정거장)` : ""}
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-slate-700 leading-snug">{step.instruction}</p>
                      {step.departureStop && step.arrivalStop && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {step.departureStop}
                          <ArrowRight className="inline w-3 h-3 mx-1" />
                          {step.arrivalStop}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {step.duration}
                        </span>
                        <span className="text-xs text-slate-400">{step.distance}</span>
                        {step.departureTime && (
                          <span className="text-xs font-medium text-emerald-600">{step.departureTime} 출발</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {parsedRoutes.length === 0 && !loading && !error && !isUnsupported && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-600">
          <Navigation className="w-10 h-10" />
          <p className="text-sm">출발지와 도착지를 입력하고 경로를 검색하세요</p>
        </div>
      )}
    </div>
  );
}

export default function DirectionsPanel() {
  const [apiKey, setApiKey] = useState<string>("");
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/maps-key")
      .then((r) => r.json())
      .then((d) => {
        if (d.key) setApiKey(d.key);
        else setKeyError(d.error || "Google Maps API 키를 가져올 수 없습니다.");
      })
      .catch(() => setKeyError("지도를 불러오는 중 오류가 발생했습니다."));
  }, []);

  if (keyError) return <ErrorAlert message={keyError} />;

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">지도 초기화 중...</p>
      </div>
    );
  }

  return <DirectionsPanelInner apiKey={apiKey} />;
}
