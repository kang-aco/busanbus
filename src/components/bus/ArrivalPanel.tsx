"use client";

import { Clock, Bus, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import type { BusArrival } from "@/lib/bus-api/types";

function ArrivalTime({ min, next = false }: { min: string; next?: boolean }) {
  const label = min.includes("분") ? min : `${min}분`;
  if (next) {
    return (
      <p className="text-xs text-slate-500 mt-0.5">
        다음 <span className="font-mono">{label}</span>
      </p>
    );
  }
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <div className="w-2 h-2 rounded-full bg-[#00ff88] pulse-dot" />
      <p className="text-sm font-bold text-[#00ff88] font-mono">{label}</p>
    </div>
  );
}

export default function ArrivalPanel({ arrivals }: { arrivals: BusArrival[] }) {
  return (
    <div role="list">
      {arrivals.length === 0 ? (
        <div className="glass-card border-dashed border-white/10 p-8 flex flex-col items-center gap-2 text-slate-600">
          <Clock className="w-8 h-8" />
          <p className="text-sm">도착 예정 정보가 없습니다.</p>
        </div>
      ) : (
        <motion.div
          className="flex flex-col gap-2"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {arrivals.map((item, idx) => {
            // 방면명: direction 필드 우선, 없으면 terminalEnd, 없으면 terminalStart→terminalEnd 표시
            const direction = item.direction
              || (item.terminalEnd ? `${item.terminalEnd} 방면` : "");

            // 노선 전체 구간 표시 (기점 → 종점)
            const routeSpan =
              item.terminalStart && item.terminalEnd
                ? `${item.terminalStart} → ${item.terminalEnd}`
                : null;

            return (
              <motion.div
                key={`${item.lineNo}-${item.station1}-${idx}`}
                role="listitem"
                variants={{
                  hidden: { opacity: 0, x: -16 },
                  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 280, damping: 22 } },
                }}
                className="glass-card"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* 왼쪽: 버스 번호 + 방면 */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#0066ff]/15 flex items-center justify-center flex-shrink-0">
                      <Bus className="w-5 h-5 text-[#4d94ff]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-base font-bold text-white">{item.lineNo}번</p>
                        {direction && (
                          <span className="text-xs font-medium text-[#4d94ff] bg-[#0066ff]/15 px-1.5 py-0.5 rounded-md">
                            {direction}
                          </span>
                        )}
                      </div>
                      {routeSpan && (
                        <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-0.5 truncate">
                          <ArrowRight className="w-2.5 h-2.5 flex-shrink-0" />
                          {routeSpan}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽: 도착 시간 */}
                  <div className="text-right flex-shrink-0">
                    {item.min1 ? (
                      <ArrivalTime min={item.min1} />
                    ) : (
                      <p className="text-xs text-slate-600">정보없음</p>
                    )}
                    {item.min2 && <ArrivalTime min={item.min2} next />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
