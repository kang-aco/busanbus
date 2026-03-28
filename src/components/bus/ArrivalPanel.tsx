"use client";

import { Clock } from "lucide-react";
import type { BusArrival } from "@/lib/bus-api/types";

export default function ArrivalPanel({ arrivals }: { arrivals: BusArrival[] }) {
  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">도착 예정 버스</h2>

      <div className="space-y-3" role="list">
        {arrivals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-500">도착 예정 정보가 없습니다.</p>
          </div>
        ) : (
          arrivals.map((item, idx) => (
            <div
              key={`${item.lineNo}-${item.station1}-${idx}`}
              className="rounded-2xl border bg-gradient-to-r from-blue-50 to-white p-4"
              role="listitem"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-blue-600">{item.lineNo}번</p>
                  {item.station1 && (
                    <p className="text-xs text-gray-500">정류소: {item.station1}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">
                    🚌 {item.min1 || "정보 없음"}
                    {item.min1 && !item.min1.includes("분") && "분"}
                  </p>
                  {item.min2 && (
                    <p className="text-xs text-gray-500">
                      다음 {item.min2}
                      {!item.min2.includes("분") && "분"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}