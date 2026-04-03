"use client";

import type { ReactNode, FormEvent } from "react";
import { useState } from "react";
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
} from "lucide-react";
import { useDirections, type TransportMode } from "@/hooks/useDirections";
import GlassCard from "@/components/ui/GlassCard";

const MODES: { id: TransportMode; label: string; icon: ReactNode }[] = [
  { id: "transit", label: "대중교통", icon: <Bus className="w-4 h-4" /> },
  { id: "driving", label: "승용차", icon: <Car className="w-4 h-4" /> },
  { id: "bicycling", label: "자전거", icon: <Bike className="w-4 h-4" /> },
  { id: "walking", label: "도보", icon: <Footprints className="w-4 h-4" /> },
];

const STEP_MODE_COLORS: Record<string, string> = {
  TRANSIT: "text-[#0066ff]",
  WALKING: "text-slate-300",
  DRIVING: "text-amber-400",
  BICYCLING: "text-green-400",
};

const STEP_MODE_ICONS: Record<string, ReactNode> = {
  TRANSIT: <Bus className="w-3.5 h-3.5" />,
  WALKING: <Footprints className="w-3.5 h-3.5" />,
  DRIVING: <Car className="w-3.5 h-3.5" />,
  BICYCLING: <Bike className="w-3.5 h-3.5" />,
};

export default function DirectionsPanel() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState<TransportMode>("transit");
  const { loading, error, result, search, reset } = useDirections();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    search(origin, destination, mode);
  };

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    reset();
  };

  return (
    <div className="flex flex-col gap-4">
      <GlassCard className="gap-3 flex flex-col">
        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00ff88]" />
            <input
              type="text"
              value={origin}
              onChange={(e) => { setOrigin(e.target.value); reset(); }}
              placeholder="출발지 입력 (예: 서면역)"
              className="glass-input w-full pl-10 pr-4 py-3 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-white/10" />
            <button
              type="button"
              onClick={handleSwap}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="출발지와 도착지 바꾸기"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="relative">
            <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0066ff]" />
            <input
              type="text"
              value={destination}
              onChange={(e) => { setDestination(e.target.value); reset(); }}
              placeholder="도착지 입력 (예: 해운대역)"
              className="glass-input w-full pl-10 pr-4 py-3 text-sm"
            />
          </div>

          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setMode(m.id); reset(); }}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                  mode === m.id
                    ? "bg-[#0066ff] text-white shadow-lg"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {m.icon}
                <span className="text-[10px] leading-tight">{m.label}</span>
              </button>
            ))}
          </div>

          <motion.button
            type="submit"
            disabled={!origin.trim() || !destination.trim() || loading}
            className="btn-primary flex items-center justify-center gap-2 py-3 px-6 disabled:opacity-40 disabled:cursor-not-allowed w-full"
            whileTap={{ scale: 0.97 }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="text-sm font-semibold">{loading ? "검색 중..." : "경로 검색"}</span>
          </motion.button>
        </form>
      </GlassCard>

      {error && <ErrorAlert message={error} />}

      <AnimatePresence>
        {result && (
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          >
            <GlassCard glowColor="blue" className="gradient-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0066ff]/20 text-[#4d94ff]">
                  최적 경로
                </span>
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  {MODES.find((m) => m.id === mode)?.icon}
                  <span>{MODES.find((m) => m.id === mode)?.label}</span>
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-white font-mono">{result.duration}</span>
                <span className="text-sm text-slate-400">{result.distance}</span>
              </div>
            </GlassCard>

            <GlassCard className="gap-0 p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#0066ff]" />
                  상세 경로
                </h3>
              </div>
              <motion.div
                className="flex flex-col divide-y divide-white/5"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              >
                {result.steps.map((step, idx) => (
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
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-[#0066ff]/20 text-[#4d94ff]">
                            <Bus className="w-3 h-3" />
                            {step.transitLine}
                            {step.numStops && ` (${step.numStops}정거장)`}
                          </span>
                        </div>
                      )}

                      <p className="text-sm text-slate-200 leading-snug">{step.instruction}</p>

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
                        <span className="text-xs text-slate-600">{step.distance}</span>
                        {step.departureTime && (
                          <span className="text-xs text-[#00ff88]">{step.departureTime} 출발</span>
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

      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-600">
          <Navigation className="w-10 h-10" />
          <p className="text-sm">출발지와 도착지를 입력하고 경로를 검색하세요</p>
        </div>
      )}
    </div>
  );
}
