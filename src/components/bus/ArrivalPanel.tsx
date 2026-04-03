"use client";

import { Clock, Bus } from "lucide-react";
import { motion } from "motion/react";
import type { BusArrival } from "@/lib/bus-api/types";

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
          {arrivals.map((item, idx) => (
            <motion.div
              key={`${item.lineNo}-${item.station1}-${idx}`}
              role="listitem"
              variants={{
                hidden: { opacity: 0, x: -16 },
                show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 280, damping: 22 } },
              }}
              className="glass-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0066ff]/15 flex items-center justify-center flex-shrink-0">
                    <Bus className="w-5 h-5 text-[#4d94ff]" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{item.lineNo}번</p>
                    {item.station1 && (
                      <p className="text-xs text-slate-500">{item.station1}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <div className="w-2 h-2 rounded-full bg-[#00ff88] pulse-dot" />
                    <p className="text-sm font-bold text-[#00ff88] font-mono">
                      {item.min1 || "정보없음"}
                      {item.min1 && !item.min1.includes("분") ? "분" : ""}
                    </p>
                  </div>
                  {item.min2 && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      다음&nbsp;
                      <span className="font-mono">
                        {item.min2}
                        {!item.min2.includes("분") ? "분" : ""}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
