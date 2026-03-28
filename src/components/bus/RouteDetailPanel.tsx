"use client";

import { MapPin } from "lucide-react";
import type { BusLocation, BusRoute } from "@/lib/bus-api/types";

export default function RouteDetailPanel({
  route,
  locations,
}: {
  route: BusRoute | null;
  locations: BusLocation[];
}) {
  if (!route) return null;

  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-bold">{(route.lineNo || route.lineId).split(':').pop()}번 실시간 위치</h2>
        <p className="text-sm text-gray-500">
          노선 ID: {route.lineId} · 운행중인 버스: {locations.length}대
        </p>
      </div>

      <div className="space-y-3" role="list">
        {locations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <MapPin className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-500">현재 운행중인 버스가 없습니다.</p>
          </div>
        ) : (
          locations.map((bus) => (
            <div
              key={bus.vehId}
              className="rounded-2xl border bg-gradient-to-r from-green-50 to-white p-3"
              role="listitem"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    🚌 {bus.plateNo || bus.vehId}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    <MapPin className="inline h-4 w-4 text-gray-400" />{" "}
                    {bus.nodeNm || "위치 정보 없음"}
                  </p>
                </div>
                {bus.gpsX && bus.gpsY && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">좌표</p>
                    <p className="text-xs font-mono text-gray-400">
                      {parseFloat(bus.gpsY).toFixed(4)}, {parseFloat(bus.gpsX).toFixed(4)}
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