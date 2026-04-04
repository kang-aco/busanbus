"use client";

import { Clock, Bus, ArrowRight, MapPin } from "lucide-react";
import { motion } from "motion/react";
import type { BusArrival } from "@/lib/bus-api/types";

// 노선 번호 앞자리로 버스 타입 색상 구분
function getRouteColor(lineNo: string): { bg: string; text: string; border: string } {
  const n = parseInt(lineNo, 10);
  if (isNaN(n))    return { bg: "bg-violet-500/15", text: "text-violet-300", border: "border-violet-500/30" };
  if (n < 100)     return { bg: "bg-[#0066ff]/15",  text: "text-[#4d94ff]",  border: "border-[#0066ff]/30" };  // 간선
  if (n < 200)     return { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30" }; // 지선
  if (n < 1000)    return { bg: "bg-amber-500/15",   text: "text-amber-300",   border: "border-amber-500/30" };   // 마을
  return               { bg: "bg-rose-500/15",    text: "text-rose-300",    border: "border-rose-500/30" };   // 급행
}

function ArrivalTime({ min, next = false }: { min: string; next?: boolean }) {
  const label = min.includes("분") ? min : `${min}분`;
  if (next) {
    return (
      <p className="text-xs text-slate-500 mt-0.5">
        다음 <span className="font-mono text-slate-400">{label}</span>
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
            const color = getRouteColor(item.lineNo);
            const direction = item.direction || (item.terminalEnd ? `${item.terminalEnd} 방면` : "");

            return (
              <motion.div
                key={`${item.lineNo}-${item.station1}-${idx}`}
                role="listitem"
                variants={{
                  hidden: { opacity: 0, x: -16 },
                  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 280, damping: 22 } },
                }}
                className={`glass-card border-l-2 ${color.border}`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* 왼쪽 */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* 버스 번호 뱃지 */}
                    <div className={`flex-shrink-0 min-w-[2.75rem] h-10 rounded-xl ${color.bg} flex items-center justify-center px-1`}>
                      <span className={`text-sm font-extrabold ${color.text}`}>{item.lineNo}</span>
                    </div>

                    <div className="min-w-0">
                      {/* 방면 */}
                      {direction && (
                        <p className={`text-xs font-semibold ${color.text} truncate`}>
                          {direction}
                        </p>
                      )}

                      {/* 다음 정류소 */}
                      {item.nextStop && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                          <p className="text-xs text-slate-400 truncate">
                            다음&nbsp;
                            <span className="text-white font-medium">{item.nextStop}</span>
                          </p>
                        </div>
                      )}

                      {/* 기점 → 종점 구간 */}
                      {item.terminalStart && item.terminalEnd && (
                        <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-0.5 truncate">
                          <ArrowRight className="w-2.5 h-2.5 flex-shrink-0" />
                          {item.terminalStart} → {item.terminalEnd}
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
