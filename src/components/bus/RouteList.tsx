"use client";

import { Star } from "lucide-react";
import type { BusRoute } from "@/lib/bus-api/types";

export default function RouteList({
  routes,
  selectedRouteId,
  onSelect,
  isFavorite,
  onToggleFavorite,
}: {
  routes: BusRoute[];
  selectedRouteId: string | null;
  onSelect: (route: BusRoute) => void;
  isFavorite?: (lineId: string) => boolean;
  onToggleFavorite?: (route: BusRoute, currentlyFavorite: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      {routes.map((route) => {
        const isSelected = selectedRouteId === route.lineId;
        const favorite = isFavorite?.(route.lineId) ?? false;

        return (
          <div
            key={route.lineId || route.lineNo}
            className={`flex items-center gap-2 rounded-3xl border p-4 shadow-sm transition ${
              isSelected ? "border-blue-500 bg-blue-50" : "bg-white"
            }`}
          >
            <button
              onClick={() => onSelect(route)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(route);
                }
              }}
              className="flex-1 text-left"
              aria-label={`${route.lineNo}번 버스 선택`}
              aria-pressed={isSelected}
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

            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(route, favorite);
                }}
                className="rounded-full p-2 hover:bg-gray-100 transition"
                aria-label={
                  favorite ? `${route.lineNo}번 즐겨찾기 해제` : `${route.lineNo}번 즐겨찾기 추가`
                }
              >
                <Star
                  className={`h-5 w-5 ${
                    favorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
                  }`}
                />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}