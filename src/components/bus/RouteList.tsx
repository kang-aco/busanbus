"use client";

import type { BusRoute } from "@/lib/bus-api/types";

export function RouteList({
  routes,
  selectedRouteId,
  onSelect,
}: {
  routes: BusRoute[];
  selectedRouteId: string | null;
  onSelect: (route: BusRoute) => void;
}) {
  return (
    <div className="space-y-3">
      {routes.map((route) => (
        <button
          key={route.lineId || route.lineNo}
          onClick={() => onSelect(route)}
          className={`block w-full rounded-3xl border p-4 text-left shadow-sm transition ${{
            true: "border-blue-500 bg-blue-50",
            false: "bg-white",
          }[String(selectedRouteId === route.lineId) as "true" | "false"]}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">{route.lineNo}</p>
              <p className="text-xs text-gray-500">노선 ID: {route.lineId}</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
              {route.busType || "일반"}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}