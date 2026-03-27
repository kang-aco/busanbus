"use client";

import type { BusLocation, BusRoute } from "@/lib/bus-api/types";

export function RouteDetailPanel({
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
        <h2 className="text-xl font-bold">{route.lineNo}번 실시간 위치</h2>
        <p className="text-sm text-gray-500">노선 ID: {route.lineId}</p>
      </div>

      <div className="space-y-3">
        {locations.length === 0 ? (
          <p className="text-sm text-gray-500">현재 위치 정보가 없습니다.</p>
        ) : (
          locations.map((bus) => (
            <div key={bus.vehId} className="rounded-2xl border bg-gray-50 p-3">
              <p className="font-semibold">차량번호: {bus.plateNo || bus.vehId}</p>
              <p className="text-sm text-gray-600">정류소: {bus.nodeNm || "정보 없음"}</p>
              <p className="text-xs text-gray-500">좌표: {bus.gpsX || "-"}, {bus.gpsY || "-"}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}