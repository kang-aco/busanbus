"use client";

import { useMemo } from "react";
import { MapPin, Bus, Radio } from "lucide-react";
import { motion } from "motion/react";
import type { BusLocation, BusRoute } from "@/lib/bus-api/types";
import type { RouteStop } from "@/hooks/useBusRouteStops";
import { routeDisplayNumber } from "@/lib/utils";

/** 버스 한 대를 노선상의 정류장 index에 매칭 (nodeId 우선, 이름 보조) */
function matchStopIndex(bus: BusLocation, stops: RouteStop[]): number {
  if (bus.nodeId) {
    const byId = stops.findIndex(
      (s) => (s.nodeId && s.nodeId === bus.nodeId) || (s.bstopid && s.bstopid === bus.nodeId)
    );
    if (byId !== -1) return byId;
  }
  if (bus.nodeNm) {
    const byName = stops.findIndex((s) => s.name === bus.nodeNm);
    if (byName !== -1) return byName;
  }
  return -1;
}

export default function RouteDetailPanel({
  route,
  locations,
  stops = [],
}: {
  route: BusRoute | null;
  locations: BusLocation[];
  stops?: RouteStop[];
}) {
  // 각 정류장 index에 위치한 버스들을 매핑
  const busesByStop = useMemo(() => {
    const map = new Map<number, BusLocation[]>();
    if (stops.length === 0) return map;
    for (const bus of locations) {
      const idx = matchStopIndex(bus, stops);
      if (idx === -1) continue;
      map.set(idx, [...(map.get(idx) ?? []), bus]);
    }
    return map;
  }, [locations, stops]);

  // 노선 정류장 정보로 매칭되지 않은 버스 (좌표만 있는 경우 등)
  const unmatchedBuses = useMemo(() => {
    if (stops.length === 0) return locations;
    return locations.filter((bus) => matchStopIndex(bus, stops) === -1);
  }, [locations, stops]);

  if (!route) return null;

  const hasStops = stops.length > 0;

  return (
    <motion.div
      className="flex flex-col gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0066ff]/20 flex items-center justify-center">
            <Bus className="w-4 h-4 text-[#4d94ff]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {routeDisplayNumber(route.lineNo, route.lineId)}번 실시간 위치
            </h3>
            <p className="text-xs text-slate-500">운행중 {locations.length}대</p>
          </div>
        </div>
        {locations.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[#00ff88]">
            <Radio className="w-3.5 h-3.5" />
            <span>실시간</span>
          </div>
        )}
      </div>

      {/* 정류장 타임라인: 버스가 지금 지나는 정류장을 표시 */}
      {hasStops ? (
        <div className="flex flex-col">
          {stops.map((stop, idx) => {
            const busesHere = busesByStop.get(idx) ?? [];
            const hasBus = busesHere.length > 0;
            const isFirst = idx === 0;
            const isLast = idx === stops.length - 1;

            return (
              <div key={`${stop.nodeId}-${stop.seq}-${idx}`} className="flex gap-3">
                {/* 좌측 세로선 + 노드 */}
                <div className="relative flex flex-col items-center w-6 flex-shrink-0">
                  {/* 위쪽 연결선 */}
                  <div
                    className={`w-0.5 flex-1 ${isFirst ? "bg-transparent" : "bg-white/15"}`}
                    style={{ minHeight: 10 }}
                  />
                  {/* 노드 (버스가 있으면 버스 아이콘) */}
                  {hasBus ? (
                    <motion.div
                      layout
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-6 h-6 rounded-full bg-[#00ff88] flex items-center justify-center shadow-[0_0_10px_rgba(0,255,136,0.6)] z-10"
                    >
                      <span className="text-[13px] leading-none">🚌</span>
                    </motion.div>
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-white/25 border border-white/30 z-10" />
                  )}
                  {/* 아래쪽 연결선 */}
                  <div
                    className={`w-0.5 flex-1 ${isLast ? "bg-transparent" : "bg-white/15"}`}
                    style={{ minHeight: 10 }}
                  />
                </div>

                {/* 정류장 정보 */}
                <div
                  className={`flex-1 my-1 rounded-xl px-3 py-2 transition-colors ${
                    hasBus
                      ? "bg-[#00ff88]/10 border border-[#00ff88]/30"
                      : "bg-white/[0.02] border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm truncate ${
                        hasBus ? "font-bold text-white" : "font-medium text-slate-300"
                      }`}
                    >
                      {stop.name}
                    </p>
                    {stop.arsno && (
                      <span className="text-[10px] text-slate-600 font-mono flex-shrink-0">
                        {stop.arsno}
                      </span>
                    )}
                  </div>
                  {hasBus && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {busesHere.map((bus) => (
                        <span
                          key={bus.vehId}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#00ff88]/15 text-[10px] text-[#00ff88] font-medium"
                        >
                          <Bus className="w-2.5 h-2.5" />
                          {bus.plateNo || bus.vehId}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* 노선상에 매칭되지 않은 운행 버스 */}
          {unmatchedBuses.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              <p className="text-[10px] text-slate-600 px-1">
                위치 확인 중인 버스 {unmatchedBuses.length}대
              </p>
              {unmatchedBuses.map((bus) => (
                <div
                  key={bus.vehId}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5"
                >
                  <span className="text-sm">🚌</span>
                  <span className="text-xs font-semibold text-white">
                    {bus.plateNo || bus.vehId}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <MapPin className="w-2.5 h-2.5" />
                    {bus.nodeNm || "위치 정보 없음"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 노선 정류장 정보가 없을 때: 기존 버스 목록 폴백 */
        <motion.div
          className="flex flex-col gap-2"
          role="list"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        >
          {locations.length === 0 ? (
            <div className="glass-card border-dashed border-white/10 p-8 flex flex-col items-center gap-2 text-slate-600">
              <Bus className="w-8 h-8" />
              <p className="text-sm">현재 운행중인 버스가 없습니다.</p>
            </div>
          ) : (
            locations.map((bus) => (
              <motion.div
                key={bus.vehId}
                role="listitem"
                variants={{
                  hidden: { opacity: 0, x: 16 },
                  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 280, damping: 22 } },
                }}
                className="glass-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00ff88]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-lg leading-none">🚌</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{bus.plateNo || bus.vehId}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <p className="text-xs text-slate-400">{bus.nodeNm || "위치 정보 없음"}</p>
                      </div>
                    </div>
                  </div>
                  {bus.gpsX && bus.gpsY && (
                    <div className="text-right">
                      <p className="text-xs font-mono text-slate-600">
                        {parseFloat(bus.gpsY).toFixed(4)},
                      </p>
                      <p className="text-xs font-mono text-slate-600">
                        {parseFloat(bus.gpsX).toFixed(4)}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
