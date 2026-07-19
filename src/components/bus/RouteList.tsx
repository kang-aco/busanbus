"use client";

import { Star, Bus } from "lucide-react";
import { motion } from "motion/react";
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
    <motion.div
      className="flex flex-col gap-2"
      role="list"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06 } },
      }}
    >
      {routes.map((route) => {
        const isSelected = selectedRouteId === route.lineId;
        const favorite = isFavorite?.(route.lineId) ?? false;

        return (
          <motion.div
            key={route.lineId || route.lineNo}
            role="listitem"
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
            }}
          >
            <div
              className={`flex items-center gap-3 rounded-2xl border p-4 transition-all cursor-pointer ${
                isSelected
                  ? "gradient-border bg-white neon-glow-blue"
                  : "glass-card hover:bg-white hover:shadow-[0_12px_36px_rgba(15,23,42,0.12)]"
              }`}
              onClick={() => onSelect(route)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(route);
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`${route.lineNo}번 버스 선택`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  isSelected ? "bg-[#2563eb]/12" : "bg-slate-100"
                }`}
              >
                <Bus className={`w-5 h-5 ${isSelected ? "text-[#2563eb]" : "text-slate-500"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-base font-bold ${isSelected ? "text-[#2563eb]" : "text-slate-900"}`}>
                  {route.lineNo}번
                </p>
                {route.terminalStart && route.terminalEnd ? (
                  <p className="text-xs text-slate-500 truncate">
                    {route.terminalStart} → {route.terminalEnd}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 truncate">{route.lineId}</p>
                )}
              </div>

              <span
                className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  isSelected ? "bg-[#2563eb]/12 text-[#2563eb]" : "bg-slate-100 text-slate-500"
                }`}
              >
                {route.busType || "일반"}
              </span>

              {onToggleFavorite && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(route, favorite);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-900/5 transition-colors flex-shrink-0"
                  aria-label={favorite ? `${route.lineNo}번 즐겨찾기 해제` : `${route.lineNo}번 즐겨찾기 추가`}
                >
                  <Star
                    className={`w-4 h-4 transition-colors ${
                      favorite ? "fill-amber-400 text-amber-400" : "text-slate-400"
                    }`}
                  />
                </button>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
