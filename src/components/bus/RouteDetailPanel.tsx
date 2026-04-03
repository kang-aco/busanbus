"use client";

import { MapPin, Bus, Radio } from "lucide-react";
import type { BusLocation, BusRoute } from "@/lib/bus-api/types";

export default function RouteDetailPanel({
  route,
  locations,
}: {
  route: BusRoute | null;
  locations: BusLocation[];
}) {
  if (!route) return null;

  const routeDisplay = (route.lineNo || route.lineId).split(":").pop();

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0066ff]/20 flex items-center justify-center">
            <Bus className="w-4 h-4 text-[#4d94ff]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{routeDisplay}번 실시간 위치</h3>
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

      {/* Bus list */}
      <div className="flex flex-col gap-2" role="list">
        {locations.length === 0 ? (
          <div className="glass-card border-dashed border-white/10 p-8 flex flex-col items-center gap-2 text-slate-600">
            <Bus className="w-8 h-8" />
            <p className="text-sm">현재 운행중인 버스가 없습니다.</p>
          </div>
        ) : (
          locations.map((bus, idx) => (
            <div
              key={bus.vehId}
              className="glass-card animate-slide-up"
              style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}
              role="listitem"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00ff88]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-lg leading-none">🚌</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {bus.plateNo || bus.vehId}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <p className="text-xs text-slate-400">
                        {bus.nodeNm || "위치 정보 없음"}
                      </p>
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
